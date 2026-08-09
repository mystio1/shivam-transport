import crypto from 'node:crypto';
import { config } from '../env.js';
import { createSessionToken } from './sessionTokens.js';
import * as sessionsRepo from '../db/repositories/sessions.repository.js';
import type { DbClient } from '../db/prisma.js';

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Issues a signed token AND records its hash in the Session table — the token stays a
// self-contained, HMAC-verifiable credential (no DB hit needed to check its signature/expiry),
// while the Session row is what makes server-side revocation possible (see
// sessions.repository.ts's revokeAllForUser, used on password reset).
export async function issueSession(
  user: { id: string; groupId: string; role: 'admin' | 'driver' },
  client: DbClient,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<string> {
  const token = createSessionToken(
    { userId: user.id, groupId: user.groupId, role: user.role },
    config.sessionSecret,
  );
  await sessionsRepo.create(
    {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    },
    client,
  );
  return token;
}
