import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import * as billsRepo from '../db/repositories/bills.repository.js';
import * as customersRepo from '../db/repositories/customers.repository.js';
import * as groupsRepo from '../db/repositories/groups.repository.js';
import * as auditLogsRepo from '../db/repositories/auditLogs.repository.js';
import { serializeBill, serializeCustomer } from '../services/serializers.js';
import { toNumber, now } from '../services/util.js';
import { broadcast } from '../services/sse.js';
import { requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

export const billsRouter = Router();

// Shared by both POST / (save to My Bills) and POST /generation (download/WhatsApp, which don't
// otherwise touch the server at all) — a support-set cap is about how many invoice documents get
// GENERATED in a day, not how many end up saved, so both paths must check and count the same way.
async function assertUnderDailyBillLimit(groupId: string): Promise<void> {
  const group = await groupsRepo.findById(groupId);
  if (group?.maxBillsPerDay == null) return;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const billsToday = await auditLogsRepo.countSinceByActions(prisma, groupId, auditLogsRepo.BILL_GENERATION_ACTIONS, startOfToday);
  if (billsToday >= group.maxBillsPerDay) {
    throw new HttpError(403, `Daily bill limit reached (${group.maxBillsPerDay}/day). Contact support to increase it.`, 'BILL_LIMIT_REACHED');
  }
}

billsRouter.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const bills = await billsRepo.listByGroup(req.auth!.groupId);
    res.status(200).json({ bills: bills.map((b) => serializeBill(b, req.auth!.groupCode)) });
  } catch (err) { next(err); }
});

// Called before a bill is downloaded as a PDF or shared to WhatsApp — those never otherwise
// reach the server (html2canvas/print happen entirely client-side), so without this call they'd
// silently bypass the daily limit that POST / (save to My Bills) already enforces.
billsRouter.post('/generation', requireRole('admin'), async (req, res, next) => {
  try {
    await assertUnderDailyBillLimit(req.auth!.groupId);
    const customerId = String(req.body?.customerId || '').trim();
    const method = String(req.body?.method || '').trim() || 'unknown';
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'bill.generate', customerId || req.auth!.groupId, { method });
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
});

billsRouter.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const customerId = String(body.customerId || '').trim();
    if (!customerId) throw new HttpError(400, 'customerId is required');
    const trips = Array.isArray(body.trips) ? body.trips : [];

    await assertUnderDailyBillLimit(req.auth!.groupId);

    const { bill, advanceConsumed } = await prisma.$transaction((tx) =>
      billsRepo.create(req.auth!.groupId, {
        customerId,
        billNo: String(body.billNo || '').trim(),
        billDate: new Date(String(body.billDate || now())),
        isGstBill: Boolean(body.isGstBill),
        gstPercent: toNumber(body.gstPercent),
        discount: toNumber(body.discount),
        subTotal: toNumber(body.subTotal),
        received: toNumber(body.received),
        gstAmount: toNumber(body.gstAmount),
        grandTotal: toNumber(body.grandTotal),
        advanceApplied: toNumber(body.advanceApplied),
        netPayable: toNumber(body.netPayable),
        amountInWords: String(body.amountInWords || '').trim(),
        customerPhone: String(body.customerPhone || '').trim(),
        customerAddress: String(body.customerAddress || '').trim(),
        customerGst: String(body.customerGst || '').trim(),
        bankName: String(body.bankName || '').trim(),
        bankBranch: String(body.bankBranch || '').trim(),
        accountNumber: String(body.accountNumber || '').trim(),
        ifscCode: String(body.ifscCode || '').trim(),
        createdBy: req.auth!.user.name,
        trips: trips.map((t: Record<string, unknown>) => ({
          tripId: String(t.tripId || ''),
          date: t.date ? new Date(String(t.date)) : null,
          pickupLocation: String(t.pickupLocation || ''),
          dropLocation: String(t.dropLocation || ''),
          amount: toNumber(t.amount),
          paidAmount: toNumber(t.paidAmount),
        })),
      }, tx),
    );

    if (advanceConsumed > 0) {
      await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.advance.usedInBill', bill.customerId || customerId, {
        amount: advanceConsumed, billNo: bill.billNo,
      });
    }
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'bill.save', bill.id, {
      customerId: bill.customerId, billNo: bill.billNo, netPayable: bill.netPayable.toNumber(),
    });

    const updatedCustomer = await customersRepo.findByIdAndGroup(customerId, req.auth!.groupId);
    if (updatedCustomer) {
      broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.edit', customer: serializeCustomer(updatedCustomer, req.auth!.groupCode) });
    }
    res.status(201).json({ bill: serializeBill(bill, req.auth!.groupCode) });
  } catch (err) { next(err); }
});

// Soft delete — mirrors the advance-payment delete flow: kept as a record, just excluded from
// the active list, until the admin permanently removes it below.
billsRouter.delete('/:id/permanent', requireRole('admin'), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await billsRepo.permanentDelete(id, req.auth!.groupId);
    if (result === 'not-found') throw new HttpError(404, 'Bill not found');
    if (result === 'not-deleted') throw new HttpError(400, 'Only already-deleted bills can be permanently removed');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'bill.permanentDelete', id, {
      customerId: result.customerId, billNo: result.billNo,
    });
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
});

billsRouter.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await billsRepo.softDelete(String(req.params.id), req.auth!.groupId);
    if (result === 'not-found') throw new HttpError(404, 'Bill not found');
    if (result === 'already-deleted') throw new HttpError(400, 'This bill was already deleted');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'bill.delete', result.id, {
      customerId: result.customerId, billNo: result.billNo,
    });
    res.status(200).json({ bill: serializeBill(result, req.auth!.groupCode) });
  } catch (err) { next(err); }
});
