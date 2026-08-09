import type { RequestHandler } from 'express';

// Protects the database from pile-up under a real outage: if Postgres/the Supabase pooler starts
// failing, letting every incoming request try its own query (and its own timeout) just means
// more and more requests stack up waiting on a dead connection pool — the classic way an
// already-struggling database gets pushed all the way down. Instead, once failures cross the
// threshold, this middleware fails EVERY request instantly with a friendly 503 for a short
// cooldown, giving the pooler room to recover instead of being hit by an ever-growing queue.
//
// Deliberately in-memory / per-process — this app runs as a single instance (see prisma.ts's
// comment on connection pool sizing for the same assumption). A multi-instance deployment would
// need this state shared (Redis, etc.) to work the same way across instances.
const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 10_000;
const COOLDOWN_MS = 15_000;

let failureTimestamps: number[] = [];
let openUntil = 0;

export function isDbBreakerOpen(): boolean {
  return Date.now() < openUntil;
}

export function recordDbFailure(): void {
  const now = Date.now();
  failureTimestamps.push(now);
  failureTimestamps = failureTimestamps.filter((t) => now - t < FAILURE_WINDOW_MS);
  if (failureTimestamps.length >= FAILURE_THRESHOLD) {
    openUntil = now + COOLDOWN_MS;
    failureTimestamps = [];
  }
}

// Prisma connection-level error codes — P1001 (can't reach the database server), P1002 (timed
// out establishing a connection), P1008 (operation timed out), P1017 (server closed the
// connection). Deliberately narrow: a request-level error like P2002 (unique constraint) means
// the database is working fine and answered correctly, so it must never trip this breaker.
const DB_CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

export function isDbConnectionError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && DB_CONNECTION_ERROR_CODES.has(code);
}

export function checkDbBreaker(): RequestHandler {
  return (_req, res, next) => {
    if (!isDbBreakerOpen()) return next();
    const retryAfterSec = Math.max(1, Math.ceil((openUntil - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfterSec));
    res.status(503).json({
      message: 'The database is temporarily unavailable — please try again in a few seconds.',
      code: 'DB_UNAVAILABLE',
    });
  };
}
