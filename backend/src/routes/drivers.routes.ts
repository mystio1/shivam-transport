import { Router } from 'express';
import * as usersRepo from '../db/repositories/users.repository.js';
import * as auditLogsRepo from '../db/repositories/auditLogs.repository.js';
import * as sessionsRepo from '../db/repositories/sessions.repository.js';
import { prisma } from '../db/prisma.js';
import { hashPassword } from '../services/passwords.js';
import { serializeUser } from '../services/serializers.js';
import { requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

export const driversRouter = Router();

driversRouter.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const drivers = await usersRepo.listDriversByGroup(req.auth!.groupId);
    res.status(200).json({ drivers: drivers.map((d) => serializeUser(d, req.auth!.groupCode)) });
  } catch (err) { next(err); }
});

// Drivers have no recovery email on file, so if one forgets their password the admin sets a new
// one directly here and passes it along to them (call/WhatsApp) — no email/SMS needed.
driversRouter.post('/:id/reset-password', requireRole('admin'), async (req, res, next) => {
  try {
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    const driver = await usersRepo.findActiveDriverByIdAndGroup(String(req.params.id), req.auth!.groupId);
    if (!driver) throw new HttpError(404, 'Driver not found');

    // Same reasoning as the self-service reset-password route: revoking every session this
    // driver currently holds keeps an already-logged-in device from staying signed in under a
    // password the admin just changed out from under them.
    await prisma.$transaction(async (tx) => {
      await usersRepo.updatePasswordHash(driver.id, hashPassword(newPassword), tx);
      await auditLogsRepo.create(tx, req.auth!.user, req.auth!.groupId, 'driver.password.reset', driver.id);
      await sessionsRepo.revokeAllForUser(driver.id, tx);
    });
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
});
