import crypto from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import * as groupsRepo from '../db/repositories/groups.repository.js';
import * as usersRepo from '../db/repositories/users.repository.js';
import * as auditLogsRepo from '../db/repositories/auditLogs.repository.js';
import { issueSession } from '../services/authSession.js';
import { broadcast } from '../services/sse.js';
import { createSupportToken, verifySupportToken } from '../services/supportTokens.js';
import { serializeUser, serializeGroup } from '../services/serializers.js';
import { normalizeGroupCode } from '../services/util.js';
import { config } from '../env.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { Request } from 'express';

export const supportRouter = Router();

// Master password for the cross-tenant /support console (see frontend's SupportConsole.tsx) —
// lets us look up any client business by its group code and open its admin account directly,
// for remote troubleshooting. Not reachable from anywhere in the normal client-facing UI, and
// disabled entirely (every route here 404s) unless SUPPORT_ACCESS_PASSWORD is configured.
const supportLoginLimiter = rateLimiter(5, 15 * 60 * 1000, 'Too many attempts. Please wait 15 minutes and try again.');

function hasValidSupportToken(req: Request): boolean {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return Boolean(token) && verifySupportToken(token, config.sessionSecret);
}

supportRouter.post('/login', supportLoginLimiter, async (req, res, next) => {
  try {
    if (!config.supportPassword) throw new HttpError(404, 'Not found');
    const password = String(req.body?.password || '');
    // Constant-time compare so response timing can't leak how many characters matched.
    const provided = Buffer.from(password.padEnd(config.supportPassword.length, '\0'));
    const expected = Buffer.from(config.supportPassword.padEnd(password.length, '\0'));
    const matches = password.length === config.supportPassword.length && crypto.timingSafeEqual(provided, expected);
    if (!matches) throw new HttpError(401, 'Incorrect password');
    res.status(200).json({ token: createSupportToken(config.sessionSecret) });
  } catch (err) { next(err); }
});

supportRouter.get('/groups', async (req, res, next) => {
  try {
    if (!hasValidSupportToken(req)) throw new HttpError(401, 'Support session expired — log in again');
    const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const summaries = await Promise.all(groups.map(async (group) => {
      const [adminCount, driverCount, customerCount, tripCount, billsToday] = await Promise.all([
        prisma.user.count({ where: { groupId: group.id, role: 'admin', active: true } }),
        prisma.user.count({ where: { groupId: group.id, role: 'driver', active: true } }),
        prisma.customer.count({ where: { groupId: group.id } }),
        prisma.trip.count({ where: { groupId: group.id } }),
        auditLogsRepo.countSinceByActions(prisma, group.id, auditLogsRepo.BILL_GENERATION_ACTIONS, startOfToday),
      ]);
      return {
        code: group.code, name: group.name, createdAt: group.createdAt.toISOString(),
        adminCount, driverCount, customerCount, tripCount, frozen: group.frozen,
        maxDrivers: group.maxDrivers, maxAdmins: group.maxAdmins, maxBillsPerDay: group.maxBillsPerDay,
        billsToday,
      };
    }));
    res.status(200).json({ groups: summaries });
  } catch (err) { next(err); }
});

supportRouter.post('/impersonate', async (req, res, next) => {
  try {
    if (!hasValidSupportToken(req)) throw new HttpError(401, 'Support session expired — log in again');
    const groupCode = normalizeGroupCode(req.body?.groupCode);
    const group = await groupsRepo.findByCode(groupCode);
    if (!group) throw new HttpError(404, 'No business found with that code');
    const adminUser = await usersRepo.findFirstActiveAdminByGroup(group.id);
    if (!adminUser) throw new HttpError(404, 'This business has no active admin account to access');

    // Real session, same as a normal login — the rest of the app needs no special-casing to
    // work once support is "in" as this admin. Logged so there's always a trace of when and
    // which business support accessed.
    const token = await issueSession(
      { id: adminUser.id, groupId: adminUser.groupId, role: adminUser.role },
      prisma,
      { userAgent: req.headers['user-agent'], ip: req.ip },
    );
    await auditLogsRepo.create(prisma, adminUser, group.id, 'support.impersonate', adminUser.id);
    res.status(200).json({ token, user: serializeUser(adminUser, group.code), group: serializeGroup(group) });
  } catch (err) { next(err); }
});

// Locks/unlocks a business from support — instantly pushed (via the same SSE channel normal
// data-changes use) to every admin/driver device currently open on that group code, and enforced
// server-side too (see middleware/auth.ts's blockIfFrozen) so it can't be bypassed by a stale
// frontend. A fresh login is also refused while frozen (see routes/auth.routes.ts).
supportRouter.post('/set-frozen', async (req, res, next) => {
  try {
    if (!hasValidSupportToken(req)) throw new HttpError(401, 'Support session expired — log in again');
    const groupCode = normalizeGroupCode(req.body?.groupCode);
    const frozen = Boolean(req.body?.frozen);
    const group = await groupsRepo.findByCode(groupCode);
    if (!group) throw new HttpError(404, 'No business found with that code');

    const updated = await groupsRepo.setFrozen(group.id, frozen);

    // Best-effort audit trail attributed to the business's own admin (mirrors /impersonate) —
    // a business with no active admin left can still be frozen/unfrozen, it just won't have an
    // audit entry to attribute the action to.
    const adminUser = await usersRepo.findFirstActiveAdminByGroup(group.id);
    if (adminUser) {
      await auditLogsRepo.create(prisma, adminUser, group.id, frozen ? 'support.freeze' : 'support.unfreeze', group.id);
    }

    // Keyed by groupId, matching how every device's /api/events connection subscribes (see
    // routes/events.routes.ts) — every OTHER broadcast() call in this codebase already uses
    // groupId for the same reason; group.code would silently reach zero connected clients.
    broadcast(group.id, frozen ? 'account-frozen' : 'account-unfrozen', {});
    res.status(200).json({ group: serializeGroup(updated) });
  } catch (err) { next(err); }
});

// A number of 0 or less is nonsensical for a "how many can there be" cap (nobody could ever
// sign up or bill anything), so it's rejected rather than silently treated as unlimited or as
// zero — both of which a support operator fat-fingering the field would find surprising.
function parseLimit(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${label} must be a positive whole number, or left blank for unlimited`);
  return n;
}

// Support-set usage caps for a business — max active drivers, max active admins, and max bills
// generated per calendar day. `null`/blank means unlimited. Enforced server-side at driver/admin
// signup (routes/auth.routes.ts) and bill creation (routes/bills.routes.ts) respectively.
supportRouter.post('/set-limits', async (req, res, next) => {
  try {
    if (!hasValidSupportToken(req)) throw new HttpError(401, 'Support session expired — log in again');
    const groupCode = normalizeGroupCode(req.body?.groupCode);
    const group = await groupsRepo.findByCode(groupCode);
    if (!group) throw new HttpError(404, 'No business found with that code');

    const maxDrivers = parseLimit(req.body?.maxDrivers, 'Max drivers');
    const maxAdmins = parseLimit(req.body?.maxAdmins, 'Max admins');
    const maxBillsPerDay = parseLimit(req.body?.maxBillsPerDay, 'Max bills per day');

    const updated = await groupsRepo.setLimits(group.id, { maxDrivers, maxAdmins, maxBillsPerDay });

    const adminUser = await usersRepo.findFirstActiveAdminByGroup(group.id);
    if (adminUser) {
      await auditLogsRepo.create(prisma, adminUser, group.id, 'support.setLimits', group.id, {
        maxDrivers, maxAdmins, maxBillsPerDay,
      });
    }

    res.status(200).json({
      group: { ...serializeGroup(updated), maxDrivers: updated.maxDrivers, maxAdmins: updated.maxAdmins, maxBillsPerDay: updated.maxBillsPerDay },
    });
  } catch (err) { next(err); }
});
