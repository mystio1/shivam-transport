import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Normalizes an Indian phone number for wa.me links: strips everything but digits,
// and adds the 91 country code when the number looks like a plain 10-digit local number.
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits; // already includes a country code (or is unusual — let wa.me validate it)
}

export function buildWhatsAppLink(phone: string, message: string): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// Opens WhatsApp with the message pre-filled so a human just taps Send —
// no WhatsApp Business API / approval needed.
export async function openWhatsApp(phone: string, message: string): Promise<boolean> {
  const url = buildWhatsAppLink(phone, message);
  if (!url) return false;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return true;
}
