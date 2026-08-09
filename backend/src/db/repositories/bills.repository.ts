import type { Bill, BillTripLine } from '@prisma/client';
import { prisma, type DbClient } from '../prisma.js';
import { toNumber } from '../../services/util.js';

export type BillWithLines = Bill & { tripLines: BillTripLine[] };

const withLines = { tripLines: true };

export function listByGroup(groupId: string, client: DbClient = prisma): Promise<BillWithLines[]> {
  return client.bill.findMany({
    where: { groupId },
    include: withLines,
    orderBy: { createdAt: 'desc' },
  });
}

export function findByIdAndGroup(id: string, groupId: string, client: DbClient = prisma): Promise<BillWithLines | null> {
  return client.bill.findFirst({ where: { id, groupId }, include: withLines });
}

export interface CreateBillInput {
  customerId: string;
  billNo: string;
  billDate: Date;
  isGstBill: boolean;
  gstPercent: number;
  discount: number;
  subTotal: number;
  received: number;
  gstAmount: number;
  grandTotal: number;
  advanceApplied: number;
  netPayable: number;
  amountInWords: string;
  customerPhone: string;
  customerAddress: string;
  customerGst: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  createdBy: string;
  trips: { tripId: string; date: Date | null; pickupLocation: string; dropLocation: string; amount: number; paidAmount: number }[];
}

// The whole point of this function is that it MUST run inside a transaction: saving a bill
// "spends" the customer's advance balance for real (moving consumed AdvanceEntry rows into the
// deleted/used state, oldest deposit first, splitting one if the amount doesn't land exactly on
// a deposit boundary) — if the bill insert committed but the advance consumption didn't (or vice
// versa), the customer's balance and their bill history would permanently disagree with each
// other. Callers MUST pass a transaction client.
export async function create(
  groupId: string,
  input: CreateBillInput,
  tx: DbClient,
): Promise<{ bill: BillWithLines; advanceConsumed: number }> {
  const customer = await tx.customer.findFirstOrThrow({ where: { id: input.customerId, groupId } });

  const bill = await tx.bill.create({
    data: {
      groupId,
      customerId: customer.id,
      customerName: customer.name,
      billNo: input.billNo,
      billDate: input.billDate,
      isGstBill: input.isGstBill,
      gstPercent: input.gstPercent,
      discount: input.discount,
      subTotal: input.subTotal,
      received: input.received,
      gstAmount: input.gstAmount,
      grandTotal: input.grandTotal,
      advanceApplied: input.advanceApplied,
      netPayable: input.netPayable,
      amountInWords: input.amountInWords,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      customerGst: input.customerGst,
      bankName: input.bankName,
      bankBranch: input.bankBranch,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      createdBy: input.createdBy,
      tripLines: {
        create: input.trips.map((t) => ({
          tripId: t.tripId || null,
          date: t.date,
          pickupLocation: t.pickupLocation,
          dropLocation: t.dropLocation,
          amount: t.amount,
          paidAmount: t.paidAmount,
        })),
      },
    },
  });

  let advanceConsumed = 0;
  if (input.advanceApplied > 0) {
    const available = toNumber(customer.advanceBalance);
    let remaining = Math.min(input.advanceApplied, available);
    advanceConsumed = remaining;
    if (remaining > 0) {
      const activeEntries = await tx.advanceEntry.findMany({
        where: { customerId: customer.id, deleted: false },
        orderBy: { date: 'asc' },
      });
      const now = new Date();
      for (const entry of activeEntries) {
        if (remaining <= 0) break;
        const entryAmount = toNumber(entry.amount);
        if (entryAmount <= remaining) {
          await tx.advanceEntry.update({
            where: { id: entry.id },
            data: { deleted: true, deletedAt: now, usedInBillNo: bill.billNo, usedInBillId: bill.id },
          });
          remaining -= entryAmount;
        } else {
          await tx.advanceEntry.update({ where: { id: entry.id }, data: { amount: entryAmount - remaining } });
          await tx.advanceEntry.create({
            data: {
              customerId: customer.id, groupId, amount: remaining, note: entry.note, date: entry.date,
              deleted: true, deletedAt: now, usedInBillNo: bill.billNo, usedInBillId: bill.id,
            },
          });
          remaining = 0;
        }
      }
      await tx.customer.update({
        where: { id: customer.id },
        data: { advanceBalance: available - Math.min(input.advanceApplied, available) },
      });
    }
  }
  await tx.customer.update({ where: { id: customer.id }, data: { updatedAt: new Date() } });

  const withLinesResult = await tx.bill.findFirstOrThrow({ where: { id: bill.id }, include: withLines });
  return { bill: withLinesResult, advanceConsumed };
}

export async function softDelete(id: string, groupId: string, client: DbClient = prisma): Promise<BillWithLines | 'not-found' | 'already-deleted'> {
  const bill = await client.bill.findFirst({ where: { id, groupId } });
  if (!bill) return 'not-found';
  if (bill.deleted) return 'already-deleted';
  await client.bill.update({ where: { id }, data: { deleted: true, deletedAt: new Date() } });
  return (await client.bill.findFirst({ where: { id }, include: withLines }))!;
}

export async function permanentDelete(id: string, groupId: string, client: DbClient = prisma): Promise<Bill | 'not-found' | 'not-deleted'> {
  const bill = await client.bill.findFirst({ where: { id, groupId } });
  if (!bill) return 'not-found';
  if (!bill.deleted) return 'not-deleted';
  await client.bill.delete({ where: { id } });
  return bill;
}
