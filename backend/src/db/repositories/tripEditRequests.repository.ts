import type { TripEditRequest } from '@prisma/client';
import { prisma, type DbClient } from '../prisma.js';

// Admin sees every request in the group; a driver only ever sees their own — enforced by the
// caller passing `driverId` (see routes/tripEditRequests.routes.ts).
export function listByGroup(
  groupId: string,
  filter: { driverId?: string } = {},
  client: DbClient = prisma,
): Promise<TripEditRequest[]> {
  return client.tripEditRequest.findMany({
    where: { groupId, ...(filter.driverId ? { driverId: filter.driverId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

export function findByIdAndGroup(
  id: string,
  groupId: string,
  client: DbClient = prisma,
): Promise<TripEditRequest | null> {
  return client.tripEditRequest.findFirst({ where: { id, groupId } });
}

export function create(
  data: { groupId: string; tripId: string; driverId: string; driverName: string; message: string },
  client: DbClient = prisma,
): Promise<TripEditRequest> {
  return client.tripEditRequest.create({ data });
}

export async function updateStatus(
  id: string,
  groupId: string,
  status: 'resolved' | 'dismissed',
  client: DbClient = prisma,
): Promise<TripEditRequest | null> {
  const existing = await client.tripEditRequest.findFirst({ where: { id, groupId } });
  if (!existing) return null;
  return client.tripEditRequest.update({ where: { id }, data: { status, resolvedAt: new Date() } });
}
