import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSessionToken, verifySessionToken } from './sessionTokens.js';

const CLAIMS = { userId: 'user-1', groupId: 'group-1', role: 'admin' as const };
const SECRET = 'test-secret-a';

afterEach(() => {
  vi.useRealTimers();
});

describe('sessionTokens', () => {
  it('round-trips claims through create/verify with the same secret', () => {
    const token = createSessionToken(CLAIMS, SECRET);
    const payload = verifySessionToken(token, SECRET);
    expect(payload).toMatchObject(CLAIMS);
  });

  it('rejects a token verified against the wrong secret', () => {
    const token = createSessionToken(CLAIMS, SECRET);
    expect(verifySessionToken(token, 'a-different-secret')).toBeNull();
  });

  it('rejects a tampered payload even if the signature segment is untouched', () => {
    const token = createSessionToken(CLAIMS, SECRET);
    const [encoded, sig] = token.split('.');
    const tamperedPayload = { ...CLAIMS, role: 'admin', userId: 'someone-elses-id' };
    const tamperedEncoded = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
    expect(verifySessionToken(`${tamperedEncoded}.${sig}`, SECRET)).toBeNull();
    expect(encoded).not.toBe(tamperedEncoded); // sanity check the tamper actually changed something
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = createSessionToken(CLAIMS, SECRET);
    vi.setSystemTime(new Date('2026-02-15T00:00:00Z')); // 45 days later — past the 30-day expiry
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it('accepts a token right up until it expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = createSessionToken(CLAIMS, SECRET);
    vi.setSystemTime(new Date('2026-01-29T00:00:00Z')); // 28 days later — still within 30 days
    expect(verifySessionToken(token, SECRET)).toMatchObject(CLAIMS);
  });

  it.each([
    ['empty string', ''],
    ['no dot separator', 'not-a-real-token'],
    ['too many segments', 'a.b.c'],
    ['invalid base64url payload', '!!!not-base64.sig'],
    ['undefined-like input', null as unknown as string],
  ])('rejects malformed input: %s', (_label, malformed) => {
    expect(verifySessionToken(malformed, SECRET)).toBeNull();
  });
});
