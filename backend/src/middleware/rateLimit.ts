import rateLimit from 'express-rate-limit';

// In-memory store (express-rate-limit's default) — matches the same single-Render-instance
// assumption backend/server.mjs's hand-rolled Map-based limiter already made. Same bucket
// numbers as the proven-in-production values (signup: 8/hour, login: 5/min, forgot-password:
// 5/hour, reset-password verify: 10/hour, email: 10/hour) — carried over verbatim, not re-tuned.
export function rateLimiter(max: number, windowMs: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

export const signupLimiter = rateLimiter(8, 60 * 60 * 1000, 'Too many signup attempts. Please try again later.');
export const loginLimiter = rateLimiter(5, 60 * 1000, 'Too many login attempts. Please wait a minute and try again.');
export const forgotPasswordLimiter = rateLimiter(5, 60 * 60 * 1000, 'Too many requests. Please try again later.');
export const resetPasswordLimiter = rateLimiter(10, 60 * 60 * 1000, 'Too many attempts. Please try again later.');
export const emailLimiter = rateLimiter(10, 60 * 60 * 1000, 'Too many emails sent. Please try again later.');

// Applied across every /api route (on top of the narrower ones above) — the last line of defense
// against a single client (a buggy retry loop, a runaway offline-sync queue, an abusive script)
// hammering the database with requests. 300/5min per IP is generous for genuine use — loading
// every page in the app plus submitting several trips back-to-back doesn't come close — while
// still capping how much load any one source can put on the database.
export const globalApiLimiter = rateLimiter(300, 5 * 60 * 1000, 'Too many requests from this device. Please slow down and try again shortly.');
