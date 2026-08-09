import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { VehicleDocument } from '../types';

const REMINDER_HOUR = 9; // fire at 9 AM local time on the device

export interface DocumentReminderTarget {
  vehicleNumber: string;
  document: VehicleDocument;
}

// Deterministic 32-bit id from a document's own id, so re-scheduling the same document always
// replaces its previous notification instead of piling up duplicates across app opens.
function notificationId(documentId: string): number {
  let hash = 0;
  for (let i = 0; i < documentId.length; i++) {
    hash = (hash * 31 + documentId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

// Next occurrence of REMINDER_HOUR:00 local time — today if it hasn't passed yet, else tomorrow.
// This is only the anchor for the FIRST fire; `every: 'day'` handles every fire after that.
function nextMorning(): Date {
  const at = new Date();
  at.setHours(REMINDER_HOUR, 0, 0, 0);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  return at;
}

// Schedules one daily-repeating on-device notification per active reminder (already filtered by
// the caller to exclude documents the admin snoozed or permanently dismissed), so the reminder
// keeps surfacing every day — even with the app closed — until the document is renewed, snoozed,
// or dismissed. Native platforms only; the web app relies on the in-app banner/notification
// center in Layout.tsx and Header.tsx instead, which only fire while the app is open.
export async function scheduleDocumentReminders(targets: DocumentReminderTarget[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return;
  }

  // Full replace on every call: cancel everything pending, then schedule fresh from the current
  // target list. This app only ever schedules document-reminder notifications, so it's safe to
  // treat "all pending" as "all ours" — simpler than diffing against what changed.
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }

  if (!targets.length) return;

  const at = nextMorning();
  const notifications = targets.map(({ vehicleNumber, document }) => {
    const expiryLabel = new Date(document.expiryDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    return {
      id: notificationId(document.id),
      title: 'Vehicle document needs attention',
      body: `${vehicleNumber} — ${document.label} expires ${expiryLabel}`,
      schedule: { at, every: 'day' as const },
    };
  });

  await LocalNotifications.schedule({ notifications });
}
