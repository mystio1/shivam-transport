import type { VehicleDocument } from '../types';

export const DEFAULT_REMINDER_DAYS = 7;

export interface DocumentStatus {
  daysUntilExpiry: number;
  state: 'expired' | 'due-soon' | 'ok';
}

// Shared by the DocumentReminders page, the sidebar badge count, the in-app Layout banner, the
// notification center, and the native-notification scheduler, so "what counts as due soon" is
// computed identically everywhere instead of drifting across copies.
export function documentStatus(document: VehicleDocument): DocumentStatus {
  const expiry = new Date(document.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const reminderDays = document.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS;
  const state = daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= reminderDays ? 'due-soon' : 'ok';
  return { daysUntilExpiry, state };
}
