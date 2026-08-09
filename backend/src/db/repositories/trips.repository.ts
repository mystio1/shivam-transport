import type { Trip, TripStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../prisma.js';
import { toNumber } from '../../services/util.js';

export function listByGroup(
  groupId: string,
  filter: { status?: string | null; driverId?: string } = {},
  client: DbClient = prisma,
): Promise<Trip[]> {
  return client.trip.findMany({
    where: {
      groupId,
      ...(filter.driverId ? { driverId: filter.driverId } : {}),
      ...(filter.status ? { status: filter.status as TripStatus } : {}),
    },
    orderBy: [{ submittedAt: 'desc' }],
  });
}

export function findByIdAndGroup(id: string, groupId: string, client: DbClient = prisma): Promise<Trip | null> {
  return client.trip.findFirst({ where: { id, groupId } });
}

// Idempotency lookup for offline-queued driver submissions — see create() below.
export function findByClientRequestId(
  groupId: string,
  clientRequestId: string,
  client: DbClient = prisma,
): Promise<Trip | null> {
  return client.trip.findFirst({ where: { groupId, clientRequestId } });
}

export interface CreateTripInput {
  groupId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  driverId: string;
  driverName: string;
  driverCode?: string;
  date: Date;
  pickupLocation: string;
  dropLocation: string;
  amount: number;
  advanceAmount: number;
  isPaid: boolean;
  paymentMode?: string;
  vehicleType: string;
  vehicleNumber?: string;
  materialType?: string;
  status: TripStatus;
  approvedById?: string | null;
  clientRequestId?: string | null;
}

// Returns { trip, replayed: true } if `clientRequestId` was already used for a previous
// submission — the offline queue on the driver's device retries a submission whenever it isn't
// sure the first attempt reached the server (flaky connection, app killed mid-request), and
// without this check each retry created a brand-new duplicate trip. `clientRequestId` is
// nullable + unique-per-group (see prisma/schema.prisma), so admin-direct creation — which never
// sends one — is completely unaffected: Postgres treats multiple NULLs as non-conflicting.
export async function create(
  data: CreateTripInput,
  client: DbClient = prisma,
): Promise<{ trip: Trip; replayed: boolean }> {
  if (data.clientRequestId) {
    const existing = await findByClientRequestId(data.groupId, data.clientRequestId, client);
    if (existing) return { trip: existing, replayed: true };
  }

  const now = new Date();
  const insertData = {
    groupId: data.groupId,
    customerId: data.customerId || null,
    customerName: data.customerName,
    customerPhone: data.customerPhone || '',
    customerAddress: data.customerAddress || '',
    driverId: data.driverId,
    driverName: data.driverName,
    driverCode: data.driverCode || '',
    date: data.date,
    pickupLocation: data.pickupLocation,
    dropLocation: data.dropLocation,
    amount: data.amount,
    advanceAmount: data.advanceAmount,
    isPaid: data.isPaid,
    paidAmount: data.isPaid ? data.amount : data.advanceAmount,
    paymentMode: data.paymentMode || '',
    paidAt: data.isPaid ? now : null,
    vehicleType: data.vehicleType,
    vehicleNumber: data.vehicleNumber || '',
    materialType: data.materialType || '',
    status: data.status,
    submittedAt: now,
    approvedAt: data.status === 'approved' ? now : null,
    approvedById: data.approvedById || null,
    clientRequestId: data.clientRequestId || null,
  };

  try {
    const trip = await client.trip.create({ data: insertData });
    return { trip, replayed: false };
  } catch (err) {
    // Same-instant duplicate submission racing the check above — same reasoning as
    // customers.repository.ts's findOrCreate: this create() call isn't nested inside any
    // surrounding transaction, so catching its failure here can't poison anything else.
    if (data.clientRequestId && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await findByClientRequestId(data.groupId, data.clientRequestId, client);
      if (existing) return { trip: existing, replayed: true };
    }
    throw err;
  }
}

// Drivers can fix trip/customer details and the amount on their own still-pending trip, but not
// payment status or the customer link — those are admin-only concerns regardless of who
// submitted the trip. Once approved, a driver can no longer PATCH directly at all (see
// trips.routes.ts) — they go through the edit-request flow instead.
const ADMIN_ONLY_STRING_FIELDS = ['customerId', 'paymentMode', 'paymentNote'] as const;
const SHARED_STRING_FIELDS = [
  'customerName', 'customerPhone', 'customerAddress',
  'pickupLocation', 'dropLocation', 'vehicleType', 'vehicleNumber', 'materialType',
] as const;

// Generic edit — mirrors server.mjs's PATCH /api/trips/:id field-by-field, with the driver/admin
// field split enforced here too (not just at the route's role check) so a driver can never widen
// what they can touch by hitting this repository function some other way. Returns null if the
// trip doesn't belong to this group.
export async function update(
  id: string,
  groupId: string,
  patch: Record<string, unknown>,
  options: { isAdmin: boolean },
  client: DbClient = prisma,
): Promise<Trip | null> {
  const existing = await client.trip.findFirst({ where: { id, groupId } });
  if (!existing) return null;

  // Unchecked variant — it exposes the `customerId` scalar FK directly, instead of requiring
  // the nested `customer: { connect: ... }` relation syntax the checked TripUpdateInput demands.
  const data: Prisma.TripUncheckedUpdateInput = {};
  const patchableFields = options.isAdmin
    ? [...ADMIN_ONLY_STRING_FIELDS, ...SHARED_STRING_FIELDS]
    : SHARED_STRING_FIELDS;
  for (const key of patchableFields) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      data[key] = String(patch[key] ?? '').trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'date')) {
    data.date = new Date(String(patch.date));
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'amount')) {
    const amount = toNumber(patch.amount);
    if (amount <= 0) throw new RangeError('Amount must be greater than zero');
    data.amount = amount;
  }
  if (!options.isAdmin) {
    return client.trip.update({ where: { id }, data });
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'advanceAmount')) {
    const advanceAmount = toNumber(patch.advanceAmount);
    if (advanceAmount < 0) throw new RangeError('Advance amount cannot be negative');
    data.advanceAmount = advanceAmount;
    // Raising the advance on an edit means more was actually collected upfront — reflect that in
    // the running paid total (never lowers it; a later real payment isn't erased).
    data.paidAmount = Math.max(toNumber(existing.paidAmount), advanceAmount);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'paidAmount')) {
    data.paidAmount = toNumber(patch.paidAmount);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'isPaid')) {
    const isPaid = Boolean(patch.isPaid);
    data.isPaid = isPaid;
    if (isPaid && !existing.isPaid) {
      data.paidAt = new Date();
      data.paidAmount = data.amount ?? existing.amount;
    }
    if (!isPaid) {
      data.paidAt = null;
      data.paymentMode = '';
      data.paymentNote = '';
      data.paidAmount = 0;
    }
  }

  return client.trip.update({ where: { id }, data });
}

// Callers MUST pass a transaction client when `fromAdvance` is set — the customer's balance and
// the trip's paid total have to move together. `amount` is capped at what's actually still owed,
// re-read fresh from the row inside this call rather than trusted from the request (fixes the
// original app having no such cap on a manually-typed payment amount, only on "mark fully paid").
export async function recordPayment(
  id: string,
  groupId: string,
  input: { amount?: number; fullyPaid?: boolean; fromAdvance?: boolean; paymentMode?: string; note?: string },
  client: DbClient = prisma,
): Promise<{ trip: Trip } | 'not-found' | 'zero-amount' | 'insufficient-advance'> {
  const trip = await client.trip.findFirst({ where: { id, groupId } });
  if (!trip) return 'not-found';

  const alreadyPaid = toNumber(trip.paidAmount);
  const remaining = Math.max(0, toNumber(trip.amount) - alreadyPaid);
  const amount = input.fullyPaid ? remaining : Math.min(toNumber(input.amount), remaining);
  if (amount <= 0) return 'zero-amount';

  if (input.fromAdvance) {
    if (!trip.customerId) return 'insufficient-advance';
    const customer = await client.customer.findFirst({ where: { id: trip.customerId, groupId } });
    const available = customer ? toNumber(customer.advanceBalance) : 0;
    if (!customer || amount > available) return 'insufficient-advance';
    await client.customer.update({ where: { id: customer.id }, data: { advanceBalance: available - amount } });
  }

  const paidAmount = alreadyPaid + amount;
  const updated = await client.trip.update({
    where: { id },
    data: {
      paidAmount,
      isPaid: paidAmount >= toNumber(trip.amount),
      paymentMode: String(input.paymentMode || trip.paymentMode || '').trim(),
      paidAt: new Date(),
      ...(typeof input.note === 'string' ? { paymentNote: input.note.trim() } : {}),
    },
  });
  return { trip: updated };
}

export async function approve(
  id: string,
  groupId: string,
  approvedById: string,
  approvedCustomer: { id: string; name: string },
  client: DbClient = prisma,
): Promise<Trip | null> {
  const existing = await client.trip.findFirst({ where: { id, groupId } });
  if (!existing) return null;
  return client.trip.update({
    where: { id },
    data: {
      customerId: approvedCustomer.id,
      customerName: approvedCustomer.name,
      status: 'approved',
      rejectionReason: '',
      approvedAt: new Date(),
      approvedById,
    },
  });
}

export async function reject(
  id: string,
  groupId: string,
  reason: string,
  client: DbClient = prisma,
): Promise<Trip | null> {
  const existing = await client.trip.findFirst({ where: { id, groupId } });
  if (!existing) return null;
  return client.trip.update({
    where: { id },
    data: { status: 'rejected', rejectionReason: reason || 'Rejected by admin' },
  });
}
