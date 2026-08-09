import { Router } from 'express';
import * as brandingRepo from '../db/repositories/branding.repository.js';
import { DRIVER_VISIBLE_BRANDING_FIELDS, type Branding } from '../services/branding.js';
import { broadcast } from '../services/sse.js';
import { requireRole } from '../middleware/auth.js';

export const brandingRouter = Router();

brandingRouter.get('/', async (req, res, next) => {
  try {
    const branding = await brandingRepo.get(req.auth!.groupId);
    if (req.auth!.user.role !== 'admin') {
      const publicBranding: Record<string, Branding[keyof Branding]> = {};
      for (const key of DRIVER_VISIBLE_BRANDING_FIELDS) publicBranding[key] = branding[key];
      return res.status(200).json({ branding: publicBranding });
    }
    res.status(200).json({ branding });
  } catch (err) { next(err); }
});

brandingRouter.put('/', requireRole('admin'), async (req, res, next) => {
  try {
    const updated = await brandingRepo.update(req.auth!.groupId, req.body ?? {});
    broadcast(req.auth!.groupId, 'data-changed', { type: 'branding.update', branding: updated });
    res.status(200).json({ branding: updated });
  } catch (err) { next(err); }
});

brandingRouter.post('/next-invoice-number', requireRole('admin'), async (req, res, next) => {
  try {
    const invoiceNumber = await brandingRepo.consumeNextInvoiceNumber(req.auth!.groupId);
    res.status(200).json({ invoiceNumber });
  } catch (err) { next(err); }
});
