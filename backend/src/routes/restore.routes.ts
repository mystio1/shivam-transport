import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import * as restoreRepo from '../db/repositories/restore.repository.js';
import * as auditLogsRepo from '../db/repositories/auditLogs.repository.js';
import { broadcast } from '../services/sse.js';
import { requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

export const restoreRouter = Router();

restoreRouter.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const incomingCustomers = Array.isArray(body.customers) ? body.customers : [];
    const incomingTrips = Array.isArray(body.trips) ? body.trips : [];
    if (!incomingCustomers.length && !incomingTrips.length) {
      throw new HttpError(400, 'Backup file has no customers or trips to restore');
    }

    const groupId = req.auth!.groupId;
    const result = await prisma.$transaction(async (tx) => {
      const imported = await restoreRepo.importBackup(groupId, { customers: incomingCustomers, trips: incomingTrips }, tx);
      await auditLogsRepo.create(tx, req.auth!.user, groupId, 'data.restore', groupId, imported);
      return imported;
    });

    broadcast(groupId, 'data-changed', { type: 'data.restore' });
    res.status(200).json(result);
  } catch (err) { next(err); }
});
