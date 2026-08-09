import type { DbClient } from '../prisma.js';
import { toNumber } from '../../services/util.js';

interface BackupCustomer {
  id?: string;
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  gstNumber?: string;
  advanceBalance?: number;
  createdAt?: string;
}

interface BackupTrip {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  driverName?: string;
  driverCode?: string;
  date?: string;
  pickupLocation?: string;
  dropLocation?: string;
  amount?: number;
  advanceAmount?: number;
  isPaid?: boolean;
  paidAmount?: number;
  paymentMode?: string;
  paidAt?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  materialType?: string;
  status?: string;
  rejectionReason?: string;
  submittedAt?: string;
}

// Imports a downloaded backup file's customers/trips into the CURRENT admin's group — rewriting
// groupId and re-linking customerId to freshly-minted ids, since a backup taken from a different
// account carries that account's own ids/group. Additive: existing customers/trips in this group
// are left alone, the import is appended. `driverId` is left null (no live User row from the
// original account exists in this group — see prisma/schema.prisma's Trip.driverId comment).
// Callers MUST pass a transaction client — the whole import commits together or not at all.
export async function importBackup(
  groupId: string,
  data: { customers: BackupCustomer[]; trips: BackupTrip[] },
  tx: DbClient,
): Promise<{ customersImported: number; tripsImported: number }> {
  const idMap = new Map<string, string>(); // old customer id (from the backup) -> new id in this group

  for (const c of data.customers) {
    const created = await tx.customer.create({
      data: {
        groupId,
        name: String(c?.name || '').trim() || 'Unnamed Customer',
        phone: String(c?.phone || '').trim(),
        address: String(c?.address || '').trim(),
        email: String(c?.email || '').trim(),
        gstNumber: String(c?.gstNumber || '').trim(),
        advanceBalance: toNumber(c?.advanceBalance),
        createdAt: c?.createdAt ? new Date(c.createdAt) : new Date(),
      },
    });
    if (c?.id) idMap.set(c.id, created.id);
  }

  for (const t of data.trips) {
    const mappedCustomerId = t?.customerId ? idMap.get(t.customerId) : undefined;
    await tx.trip.create({
      data: {
        groupId,
        customerId: mappedCustomerId || null,
        customerName: String(t?.customerName || '').trim(),
        customerPhone: String(t?.customerPhone || '').trim(),
        customerAddress: String(t?.customerAddress || '').trim(),
        driverId: null,
        driverName: String(t?.driverName || '').trim(),
        driverCode: String(t?.driverCode || '').trim(),
        date: t?.date ? new Date(t.date) : new Date(),
        pickupLocation: String(t?.pickupLocation || '').trim(),
        dropLocation: String(t?.dropLocation || '').trim(),
        amount: toNumber(t?.amount),
        advanceAmount: toNumber(t?.advanceAmount),
        isPaid: Boolean(t?.isPaid),
        paidAmount: toNumber(t?.paidAmount),
        paymentMode: String(t?.paymentMode || '').trim(),
        paidAt: t?.paidAt ? new Date(t.paidAt) : null,
        vehicleType: String(t?.vehicleType || '').trim(),
        vehicleNumber: String(t?.vehicleNumber || '').trim(),
        materialType: String(t?.materialType || '').trim(),
        status: (t?.status as 'pending' | 'approved' | 'rejected') || 'approved',
        rejectionReason: String(t?.rejectionReason || '').trim(),
        submittedAt: t?.submittedAt ? new Date(t.submittedAt) : new Date(),
      },
    });
  }

  return { customersImported: data.customers.length, tripsImported: data.trips.length };
}
