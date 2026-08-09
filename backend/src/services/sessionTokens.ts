import crypto from 'node:crypto';

export interface SessionClaims {
  userId: string;
  groupId: string;
  role: 'admin' | 'driver';
}

interface SessionPayload extends SessionClaims {
  exp: number;
}

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// HMAC-signed, stateless — ported verbatim from backend/server.mjs. `secret` is passed in
// rather than closed over a module constant, so this is unit-testable with a fixed secret and
// so the caller controls exactly which secret is live at request time.
export function createSessionToken(claims: SessionClaims, secret: string): string {
  const payload: SessionPayload = { ...claims, exp: Date.now() + THIRTY_DAYS_MS };
  const encoded = base64url(payload);
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    if (expected.length !== sig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
