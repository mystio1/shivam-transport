import { Router } from 'express';
import { now } from '../services/util.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, time: now() });
});
