import crypto from 'node:crypto';

export function now(): string {
  return new Date().toISOString();
}

export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isValidEmail(value: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function normalizeGroupCode(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateGroupCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Short, human-readable ID shown next to a person's name wherever it might otherwise be
// ambiguous (two drivers both named "Ramesh", say) — e.g. "D-8F3A". Not used for login; phone
// number already uniquely identifies who's signing in.
export function generateUserCode(role: 'admin' | 'driver'): string {
  return `${role === 'admin' ? 'A' : 'D'}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

