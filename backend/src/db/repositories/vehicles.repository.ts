import type { Vehicle, VehicleDocument } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../prisma.js';

export type VehicleWithDocuments = Vehicle & { documents: VehicleDocument[] };

const withDocuments = { documents: { orderBy: { createdAt: 'asc' as const } } };

export function listByGroup(groupId: string, client: DbClient = prisma): Promise<VehicleWithDocuments[]> {
  return client.vehicle.findMany({
    where: { groupId },
    include: withDocuments,
    orderBy: { vehicleNumber: 'asc' },
  });
}

export function findByIdAndGroup(
  id: string,
  groupId: string,
  client: DbClient = prisma,
): Promise<VehicleWithDocuments | null> {
  return client.vehicle.findFirst({ where: { id, groupId }, include: withDocuments });
}

export async function create(
  groupId: string,
  vehicleNumber: string,
  client: DbClient = prisma,
): Promise<VehicleWithDocuments | 'duplicate'> {
  try {
    return await client.vehicle.create({ data: { groupId, vehicleNumber }, include: withDocuments });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return 'duplicate';
    throw err;
  }
}

export async function updateNumber(
  id: string,
  groupId: string,
  vehicleNumber: string,
  client: DbClient = prisma,
): Promise<VehicleWithDocuments | null | 'duplicate'> {
  const existing = await client.vehicle.findFirst({ where: { id, groupId } });
  if (!existing) return null;
  try {
    return await client.vehicle.update({ where: { id }, data: { vehicleNumber }, include: withDocuments });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return 'duplicate';
    throw err;
  }
}

export async function remove(id: string, groupId: string, client: DbClient = prisma): Promise<boolean> {
  const { count } = await client.vehicle.deleteMany({ where: { id, groupId } });
  return count > 0;
}

export async function addDocument(
  vehicleId: string,
  groupId: string,
  data: { label: string; expiryDate: Date; reminderDaysBefore: number },
  client: DbClient = prisma,
): Promise<VehicleWithDocuments | null> {
  const vehicle = await client.vehicle.findFirst({ where: { id: vehicleId, groupId } });
  if (!vehicle) return null;
  await client.vehicleDocument.create({ data: { vehicleId, ...data } });
  return findByIdAndGroup(vehicleId, groupId, client);
}

export async function updateDocument(
  vehicleId: string,
  groupId: string,
  documentId: string,
  patch: { label?: string; expiryDate?: Date; reminderDaysBefore?: number },
  client: DbClient = prisma,
): Promise<VehicleWithDocuments | null | 'document-not-found'> {
  const vehicle = await client.vehicle.findFirst({ where: { id: vehicleId, groupId } });
  if (!vehicle) return null;
  const document = await client.vehicleDocument.findFirst({ where: { id: documentId, vehicleId } });
  if (!document) return 'document-not-found';
  await client.vehicleDocument.update({ where: { id: documentId }, data: patch });
  return findByIdAndGroup(vehicleId, groupId, client);
}

export async function removeDocument(
  vehicleId: string,
  groupId: string,
  documentId: string,
  client: DbClient = prisma,
): Promise<VehicleWithDocuments | null | 'document-not-found'> {
  const vehicle = await client.vehicle.findFirst({ where: { id: vehicleId, groupId } });
  if (!vehicle) return null;
  const { count } = await client.vehicleDocument.deleteMany({ where: { id: documentId, vehicleId } });
  if (!count) return 'document-not-found';
  return findByIdAndGroup(vehicleId, groupId, client);
}
