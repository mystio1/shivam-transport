import crypto from 'node:crypto';

interface SupportPayload {
  support: true;
  exp: number;
}

const FOUR_HOURS_MS = 1000 * 60 * 60 * 4;

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// Deliberately signed with a distinct HMAC input (`support:${encoded}`, vs. a bare session
// token's `${encoded}` — see sessionTokens.ts) so a support token and a normal session token can
// never be confused for each other even though they share the same secret and encoding.
export function createSupportToken(secret: string): string {
  const payload: SupportPayload = { support: true, exp: Date.now() + FOUR_HOURS_MS };
  const encoded = base64url(payload);
  const sig = crypto.createHmac('sha256', secret).update(`support:${encoded}`).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySupportToken(token: string, secret: string): boolean {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return false;
    const [encoded, sig] = parts;
    const expected = crypto.createHmac('sha256', secret).update(`support:${encoded}`).digest('base64url');
    if (expected.length !== sig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SupportPayload;
    return Boolean(payload.support) && payload.exp > Date.now();
  } catch {
    return false;
  }
}
