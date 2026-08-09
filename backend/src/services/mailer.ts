import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../env.js';

let transporter: Transporter | null = null;

// Lazily created, and only if credentials are actually set — callers must handle `null` (email
// features degrade gracefully rather than crashing when GMAIL_USER/GMAIL_APP_PASSWORD are unset).
export function getMailTransporter(): Transporter | null {
  if (!config.gmailUser || !config.gmailAppPassword) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.gmailUser, pass: config.gmailAppPassword },
    });
  }
  return transporter;
}
