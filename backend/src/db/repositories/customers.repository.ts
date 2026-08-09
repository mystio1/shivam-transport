import type { Customer, AdvanceEntry } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../prisma.js';
import { toNumber } from '../../services/util.js';

export type CustomerWithHistory = Customer & { advanceEntries: AdvanceEntry[] };

const withHistory = { advanceEntries: { orderBy: { createdAt: 'asc' as const } } };

export function listByGroup(groupId: string, client: DbClient = prisma): Promise<CustomerWithHistory[]> {
  return client.customer.findMany({
    where: { groupId },
    include: withHistory,
    orderBy: { name: 'asc' },
  });
}

export function findByIdAndGroup(
  id: string,
  groupId: string,
  client: DbClient = prisma,
): Promise<CustomerWithHistory | null> {
  return client.customer.findFirst({ where: { id, groupId }, include: withHistory });
}

function findByNameCI(groupId: string, name: string, client: DbClient): Promise<CustomerWithHistory | null> {
  return client.customer.findFirst({
    where: { groupId, name: { equals: name, mode: 'insensitive' } },
    include: withHistory,
  });
}

export function create(
  data: { groupId: string; name: string; phone?: string; address?: string; email?: string; gstNumber?: string },
  client: DbClient = prisma,
): Promise<CustomerWithHistory> {
  return client.customer.create({
    data: {
      groupId: data.groupId, name: data.name,
      phone: data.phone || '', address: data.address || '',
      email: data.email || '', gstNumber: data.gstNumber || '',
    },
    include: withHistory,
  });
}

// Returns null if the row doesn't exist in this group — checked explicitly (rather than just
// `where: { id }`) so one tenant can never PATCH another tenant's customer by guessing an id.
export async function update(
  id: string,
  groupId: string,
  patch: Record<string, unknown>,
  client: DbClient = prisma,
): Promise<CustomerWithHistory | null> {
  const existing = await client.customer.findFirst({ where: { id, groupId } });
  if (!existing) return null;
  const editable = ['name', 'phone', 'address', 'email', 'gstNumber'] as const;
  const data: Record<string, string> = {};
  for (const key of editable) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      data[key] = String(patch[key] ?? '').trim();
    }
  }
  return client.customer.update({ where: { id }, data, include: withHistory });
}

// Deletes the customer AND every trip that references it, matching the original app's semantics
// (server.mjs's DELETE /api/customers/:id filters db.trips as well as db.customers) rather than
// the schema's onDelete: SetNull default, which would just orphan those trips' customerId.
// Callers MUST pass a transaction client (`prisma.$transaction((tx) => remove(id, groupId, tx))`)
// — the two deletes need to commit together or not at all.
export async function remove(id: string, groupId: string, tx: DbClient): Promise<void> {
  await tx.trip.deleteMany({ where: { customerId: id, groupId } });
  await tx.customer.deleteMany({ where: { id, groupId } });
}

// Callers MUST pass a transaction client — the entry insert and the balance update have to
// commit together or not at all.
export async function addAdvance(
  customerId: string,
  groupId: string,
  data: { amount: number; note: string; date: Date },
  tx: DbClient,
): Promise<CustomerWithHistory | null> {
  const customer = await tx.customer.findFirst({ where: { id: customerId, groupId } });
  if (!customer) return null;
  await tx.advanceEntry.create({
    data: { customerId, groupId, amount: data.amount, note: data.note, date: data.date },
  });
  await tx.customer.update({
    where: { id: customerId },
    data: { advanceBalance: toNumber(customer.advanceBalance) + data.amount },
  });
  return tx.customer.findFirst({ where: { id: customerId, groupId }, include: withHistory });
}

// Callers MUST pass a transaction client.
export async function softDeleteAdvance(
  customerId: string,
  groupId: string,
  advanceId: string,
  tx: DbClient,
): Promise<{ customer: CustomerWithHistory; entry: AdvanceEntry } | 'not-found' | 'already-deleted'> {
  const customer = await tx.customer.findFirst({ where: { id: customerId, groupId } });
  if (!customer) return 'not-found';
  const entry = await tx.advanceEntry.findFirst({ where: { id: advanceId, customerId } });
  if (!entry) return 'not-found';
  if (entry.deleted) return 'already-deleted';
  const updatedEntry = await tx.advanceEntry.update({
    where: { id: advanceId },
    data: { deleted: true, deletedAt: new Date() },
  });
  await tx.customer.update({
    where: { id: customerId },
    data: { advanceBalance: toNumber(customer.advanceBalance) - toNumber(entry.amount) },
  });
  const updatedCustomer = await tx.customer.findFirst({ where: { id: customerId, groupId }, include: withHistory });
  return { customer: updatedCustomer!, entry: updatedEntry };
}

// Callers MUST pass a transaction client.
export async function permanentDeleteAdvance(
  customerId: string,
  groupId: string,
  advanceId: string,
  tx: DbClient,
): Promise<CustomerWithHistory | 'not-found' | 'not-deleted'> {
  const customer = await tx.customer.findFirst({ where: { id: customerId, groupId } });
  if (!customer) return 'not-found';
  const entry = await tx.advanceEntry.findFirst({ where: { id: advanceId, customerId } });
  if (!entry) return 'not-found';
  if (!entry.deleted) return 'not-deleted';
  await tx.advanceEntry.delete({ where: { id: advanceId } });
  return (await tx.customer.findFirst({ where: { id: customerId, groupId }, include: withHistory }))!;
}

// Callers MUST pass a transaction client — every step below has to commit together.
export async function merge(
  sourceId: string,
  targetId: string,
  groupId: string,
  tx: DbClient,
): Promise<CustomerWithHistory | 'not-found' | 'same-customer'> {
  if (sourceId === targetId) return 'same-customer';
  const [source, target] = await Promise.all([
    tx.customer.findFirst({ where: { id: sourceId, groupId } }),
    tx.customer.findFirst({ where: { id: targetId, groupId } }),
  ]);
  if (!source || !target) return 'not-found';

  await tx.trip.updateMany({
    where: { customerId: source.id, groupId },
    data: { customerId: target.id, customerName: target.name, customerPhone: target.phone, customerAddress: target.address },
  });
  // Reassign advance entries BEFORE deleting the source row — AdvanceEntry.customerId cascades
  // on delete, so any entry still pointing at `source` when it's removed would be lost instead
  // of carried over.
  await tx.advanceEntry.updateMany({ where: { customerId: source.id }, data: { customerId: target.id } });
  await tx.customer.update({
    where: { id: target.id },
    data: { advanceBalance: toNumber(target.advanceBalance) + toNumber(source.advanceBalance) },
  });
  await tx.customer.delete({ where: { id: source.id } });
  return (await tx.customer.findFirst({ where: { id: target.id, groupId }, include: withHistory }))!;
}

// Used by trip creation/approval — finds an existing customer to attach the trip to, or creates
// one on the fly for a name the admin/driver typed without picking from the list. The unique
// constraint on (groupId, name) plus this catch-and-refetch is what closes the race where two
// concurrent submissions for the same brand-new name would otherwise both pass the initial
// "does this exist?" check and both try to create it (see prisma/schema.prisma's Customer
// @@unique for the case-sensitivity caveat).
//
// Deliberately NOT called with a transaction client from inside the trip-creation transaction:
// a Postgres transaction is poisoned by ANY statement error (a unique-constraint violation
// included) unless the failing statement was inside a SAVEPOINT, which Prisma's interactive
// transactions don't create per-query — so catching the P2002 here and continuing would just
// surface as "current transaction is aborted" on the very next query. Running this as its own
// standalone operation (default `client = prisma`) sidesteps that: if the create loses the race,
// only ITS single-statement implicit transaction fails, and the refetch that follows is a fresh,
// unaffected query. The caller then creates the Trip row as a separate step — if that second
// step fails, the worst case is a harmless customer row with no trips yet, not a correctness bug.
export async function findOrCreate(
  groupId: string,
  trip: { customerId?: string; customerName?: string; customerPhone?: string; customerAddress?: string },
  client: DbClient = prisma,
): Promise<CustomerWithHistory> {
  if (trip.customerId) {
    const existing = await findByIdAndGroup(trip.customerId, groupId, client);
    if (existing) return existing;
  }
  const name = String(trip.customerName || '').trim();
  const existingByName = await findByNameCI(groupId, name, client);
  if (existingByName) return existingByName;

  try {
    return await create(
      { groupId, name, phone: trip.customerPhone, address: trip.customerAddress },
      client,
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const race = await findByNameCI(groupId, name, client);
      if (race) return race;
    }
    throw err;
  }
}
