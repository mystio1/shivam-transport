import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import * as brandingRepo from '../db/repositories/branding.repository.js';
import * as auditLogsRepo from '../db/repositories/auditLogs.repository.js';
import { getMailTransporter } from '../services/mailer.js';
import { isValidEmail } from '../services/util.js';
import { requireRole } from '../middleware/auth.js';
import { emailLimiter } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/errorHandler.js';
import { config } from '../env.js';

export const notifyRouter = Router();

// Admin-only: this relays through the business's own Gmail account, so an unrestricted endpoint
// would let any authenticated driver send arbitrary email as the company.
notifyRouter.post('/email', requireRole('admin'), emailLimiter, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim() || 'Shivam Transport';
    const text = String(body.text || '');
    if (!isValidEmail(to)) throw new HttpError(400, 'A valid recipient email is required');
    const transporter = getMailTransporter();
    if (!transporter) {
      throw new HttpError(400, 'Email is not configured on this server. Set GMAIL_USER and GMAIL_APP_PASSWORD in the .env file, then restart the server.');
    }
    try {
      const branding = await brandingRepo.get(req.auth!.groupId);
      await transporter.sendMail({
        from: `"${branding.companyName || 'Shivam Transport'}" <${config.gmailUser}>`,
        to, subject, text,
      });
      await auditLogsRepo.create(prisma, req.auth!.user, req.auth!.groupId, 'email.sent', to, { subject });
      res.status(200).json({ ok: true });
    } catch (error) {
      throw new HttpError(502, `Could not send email: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  } catch (err) { next(err); }
});
