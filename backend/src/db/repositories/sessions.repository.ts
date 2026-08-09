import type { Session } from '@prisma/client';
import { prisma, type DbClient } from '../prisma.js';

export function create(
  data: { userId: string; tokenHash: string; expiresAt: Date; userAgent?: string | null; ip?: string | null },
  client: DbClient = prisma,
): Promise<Session> {
  return client.session.create({ data });
}

// Used by requireAuth on every request — the session token's HMAC signature/expiry is checked
// first (fast, no DB round-trip; see services/sessionTokens.ts), and THIS lookup is what makes
// revocation actually possible (a self-contained signed token has no way to be un-issued on its
// own). A row that's revoked or past its own expiresAt is treated as not found.
export function findActiveByTokenHash(tokenHash: string, client: DbClient = prisma): Promise<Session | null> {
  return client.session.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
  });
}

// Bulk-revoke — called inside the same transaction as a password reset (self-service or
// admin-resets-driver-password), so a stolen token stops working the instant the password it
// was issued under is no longer valid.
export function revokeAllForUser(userId: string, client: DbClient = prisma): Promise<{ count: number }> {
  return client.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
