import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import * as tripEditRequestsRepo from '../db/repositories/tripEditRequests.repository.js';
import * as auditLogsRepo from '../db/repositories/auditLogs.repository.js';
import { serializeTripEditRequest } from '../services/serializers.js';
import { broadcast } from '../services/sse.js';
import { requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

export const tripEditRequestsRouter = Router();

// Admin sees every pending-review request in the group; a driver only ever sees their own — so
// they can tell whether their earlier request is still waiting on the admin.
tripEditRequestsRouter.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.auth!.user.role === 'admin';
    const requests = await tripEditRequestsRepo.listByGroup(req.auth!.groupId, {
      driverId: isAdmin ? undefined : req.auth!.user.id,
    });
    res.status(200).json({ requests: requests.map(serializeTripEditRequest) });
  } catch (err) { next(err); }
});

tripEditRequestsRouter.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const status = String(req.body?.status || '').trim();
    if (status !== 'resolved' && status !== 'dismissed') throw new HttpError(400, 'Invalid status');
    const request = await tripEditRequestsRepo.updateStatus(String(req.params.id), req.auth!.groupId, status);
    if (!request) throw new HttpError(404, 'Request not found');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, `trip.editRequest.${status}`, request.tripId);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'tripEditRequest.update', request: serializeTripEditRequest(request) });
    res.status(200).json({ request: serializeTripEditRequest(request) });
  } catch (err) { next(err); }
});
