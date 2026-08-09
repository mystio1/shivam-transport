import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import * as customersRepo from '../db/repositories/customers.repository.js';
import * as auditLogsRepo from '../db/repositories/auditLogs.repository.js';
import { serializeCustomer } from '../services/serializers.js';
import { toNumber, now } from '../services/util.js';
import { broadcast } from '../services/sse.js';
import { requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

export const customersRouter = Router();

customersRouter.get('/', async (req, res, next) => {
  try {
    const customers = await customersRepo.listByGroup(req.auth!.groupId);
    res.status(200).json({ customers: customers.map((c) => serializeCustomer(c, req.auth!.groupCode)) });
  } catch (err) { next(err); }
});

customersRouter.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const name = String(body.name || '').trim();
    if (!name) throw new HttpError(400, 'Customer name is required');
    const customer = await customersRepo.create({
      groupId: req.auth!.groupId, name,
      phone: body.phone, address: body.address, email: body.email, gstNumber: body.gstNumber,
    });
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.create', customer.id);
    const serialized = serializeCustomer(customer, req.auth!.groupCode);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.create', customer: serialized });
    res.status(201).json({ customer: serialized });
  } catch (err) { next(err); }
});

customersRouter.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const customer = await customersRepo.update(String(req.params.id), req.auth!.groupId, req.body ?? {});
    if (!customer) throw new HttpError(404, 'Customer not found');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.edit', customer.id);
    const serialized = serializeCustomer(customer, req.auth!.groupCode);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.edit', customer: serialized });
    res.status(200).json({ customer: serialized });
  } catch (err) { next(err); }
});

// Record an advance payment against a customer's account (money paid before any specific trip
// exists yet — drawn down later when settling a trip's payment).
customersRouter.post('/:id/advance', requireRole('admin'), async (req, res, next) => {
  try {
    const amount = toNumber(req.body?.amount);
    if (amount <= 0) throw new HttpError(400, 'Amount must be greater than zero');
    const note = String(req.body?.note || '').trim();
    const date = String(req.body?.date || '').trim() || now();

    const customer = await prisma.$transaction((tx) =>
      customersRepo.addAdvance(String(req.params.id), req.auth!.groupId, { amount, note, date: new Date(date) }, tx),
    );
    if (!customer) throw new HttpError(404, 'Customer not found');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.advance.add', customer.id, { amount, note, date });
    const serialized = serializeCustomer(customer, req.auth!.groupCode);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.edit', customer: serialized });
    res.status(200).json({ customer: serialized });
  } catch (err) { next(err); }
});

// Soft delete — the entry stays in history flagged deleted/deletedAt, just excluded from the
// available balance and the active list.
customersRouter.delete('/:id/advance/:advanceId', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await prisma.$transaction((tx) =>
      customersRepo.softDeleteAdvance(String(req.params.id), req.auth!.groupId, String(req.params.advanceId), tx),
    );
    if (result === 'not-found') throw new HttpError(404, 'Advance entry not found');
    if (result === 'already-deleted') throw new HttpError(400, 'This advance entry was already deleted');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.advance.delete', result.customer.id, {
      amount: result.entry.amount.toNumber(), note: result.entry.note, date: result.entry.date,
    });
    const serialized = serializeCustomer(result.customer, req.auth!.groupCode);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.edit', customer: serialized });
    res.status(200).json({ customer: serialized });
  } catch (err) { next(err); }
});

// Permanently erase an already-(soft)-deleted advance entry — no way back from here.
customersRouter.delete('/:id/advance/:advanceId/permanent', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await prisma.$transaction((tx) =>
      customersRepo.permanentDeleteAdvance(String(req.params.id), req.auth!.groupId, String(req.params.advanceId), tx),
    );
    if (result === 'not-found') throw new HttpError(404, 'Advance entry not found');
    if (result === 'not-deleted') throw new HttpError(400, 'Only already-deleted entries can be permanently removed');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.advance.permanentDelete', result.id);
    const serialized = serializeCustomer(result, req.auth!.groupCode);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.edit', customer: serialized });
    res.status(200).json({ customer: serialized });
  } catch (err) { next(err); }
});

// Merge a duplicate customer record into another — moves every trip over, then removes the
// source record.
customersRouter.post('/:id/merge', requireRole('admin'), async (req, res, next) => {
  try {
    const sourceId = String(req.params.id);
    const targetId = String(req.body?.intoCustomerId || '').trim();
    const result = await prisma.$transaction((tx) =>
      customersRepo.merge(sourceId, targetId, req.auth!.groupId, tx),
    );
    if (result === 'not-found') throw new HttpError(404, 'Customer not found');
    if (result === 'same-customer') throw new HttpError(400, 'Cannot merge a customer into itself');
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.merge', result.id, {
      mergedFrom: sourceId,
    });
    const serialized = serializeCustomer(result, req.auth!.groupCode);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.merge', customerId: result.id });
    res.status(200).json({ customer: serialized });
  } catch (err) { next(err); }
});

customersRouter.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    await prisma.$transaction((tx) => customersRepo.remove(id, req.auth!.groupId, tx));
    await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'customer.delete', id);
    broadcast(req.auth!.groupId, 'data-changed', { type: 'customer.delete', customerId: id });
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
});
