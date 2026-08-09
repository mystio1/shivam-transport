// The only place PrismaClient is constructed. Repository modules (backend/src/db/repositories/*)
// import this singleton; nothing outside backend/src/db should import PrismaClient directly.
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../env.js';

// Prisma 7 requires a driver adapter for direct Postgres connections (no more built-in Rust
// engine). `config.databaseUrl` is Supabase's POOLED connection string (port 6543) — correct for
// runtime query traffic. Migrations use DIRECT_URL instead, via prisma.config.ts, never this file.
//
// Explicit, capped pool settings — this is what actually protects Supabase's (free-tier, low
// connection ceiling) database from this single Node process: `max` bounds how many connections
// this app can ever hold open against the pooler, no matter how much request traffic arrives at
// once, and `connectionTimeoutMillis` makes a checkout FAIL FAST instead of hanging forever if
// the pooler is unhealthy (see routes' dbCircuitBreaker, which reacts to that failure) — a stuck
// checkout with no timeout is exactly what turned into an indefinite hang during this project's
// original Supavisor migration troubleshooting.
const adapter = new PrismaPg({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const prisma = new PrismaClient({ adapter });

// Every repository function takes this as its client parameter (defaulting to the singleton
// above) instead of importing `prisma` directly — that's what lets a route compose several
// repository calls into one atomic unit via `prisma.$transaction(async (tx) => { ... })` and
// pass `tx` through, while still working standalone outside a transaction.
export type DbClient = PrismaClient | Prisma.TransactionClient;
