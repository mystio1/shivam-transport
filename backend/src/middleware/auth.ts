import type { Request, RequestHandler } from 'express';
import { config } from '../env.js';
import { verifySessionToken } from '../services/sessionTokens.js';
import { hashToken } from '../services/authSession.js';
import * as sessionsRepo from '../db/repositories/sessions.repository.js';
import * as usersRepo from '../db/repositories/users.repository.js';
import { HttpError } from './errorHandler.js';

// Header OR ?token= query param — the query-param fallback exists specifically because the
// browser's native EventSource API (used for /api/events SSE) cannot set custom headers.
// Ported verbatim from backend/server.mjs's getBearerToken.
function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  const token = req.query.token;
  return typeof token === 'string' ? token : null;
}

export function requireAuth(): RequestHandler {
  return async (req, _res, next) => {
    const token = getBearerToken(req);
    if (!token) return next(new HttpError(401, 'Authentication required'));

    // Signature/expiry check first (fast, no DB) — then the Session-table lookup, which is what
    // actually makes revocation possible (a self-contained signed token has no other way to be
    // un-issued; see services/authSession.ts and sessions.repository.ts).
    const payload = verifySessionToken(token, config.sessionSecret);
    if (!payload) return next(new HttpError(401, 'Authentication required'));

    const session = await sessionsRepo.findActiveByTokenHash(hashToken(token));
    if (!session) return next(new HttpError(401, 'Authentication required'));

    const user = await usersRepo.findActiveByIdAndGroup(payload.userId, payload.groupId);
    if (!user) return next(new HttpError(401, 'Authentication required'));

    req.auth = { user, groupId: user.groupId, groupCode: user.group.code, groupFrozen: user.group.frozen };
    next();
  };
}

export function requireRole(role: 'admin' | 'driver'): RequestHandler {
  return (req, _res, next) =>
    req.auth?.user.role === role ? next() : next(new HttpError(403, 'Admin access required'));
}

// Mounted after `/me` and `/events` (which must keep working while frozen — `/me` is how the
// frontend learns it's frozen at all, and `/events` is the SSE channel the unfreeze push arrives
// on) but before every other business route, so a frozen account can't read or write anything
// else — support console's "Freeze" action isn't just a frontend overlay.
export function blockIfFrozen(): RequestHandler {
  return (req, _res, next) => {
    if (req.auth?.groupFrozen) {
      return next(new HttpError(423, 'This account has been frozen by our support console. Your data is safe — contact support for recovery.', 'ACCOUNT_FROZEN'));
    }
    next();
  };
}
