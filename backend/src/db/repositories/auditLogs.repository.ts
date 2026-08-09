import type { Prisma } from '@prisma/client';
import type { DbClient } from '../prisma.js';

// Takes `client` explicitly (no default) so every call site has to decide deliberately: pass a
// transaction client (`tx`) when the audit entry must commit atomically with the change it
// describes (money-affecting mutations — bills, advances, merges, payments, password resets all
// do this), or the `prisma` singleton for a best-effort log alongside a single already-committed
// write, where losing one audit entry to a rare follow-up failure isn't worth an extra
// transaction for a plain field edit.
export function create(
  client: DbClient,
  actor: { id: string; name: string },
  groupId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown> = {},
): Promise<unknown> {
  return client.auditLog.create({
    data: {
      groupId, userId: actor.id, userName: actor.name, action, entityId,
      details: details as Prisma.InputJsonValue,
    },
  });
}

// Every action that produces a real invoice document for a customer — saving it to My Bills,
// downloading it as a PDF, or sharing it to WhatsApp — counts toward the support-set "max bills
// per day" cap, not just the ones that end up persisted as a Bill row. See routes/bills.routes.ts
// for where each of these gets logged.
export const BILL_GENERATION_ACTIONS = ['bill.save', 'bill.generate'];

export function countSinceByActions(
  client: DbClient,
  groupId: string,
  actions: string[],
  since: Date,
): Promise<number> {
  return client.auditLog.count({ where: { groupId, action: { in: actions }, createdAt: { gte: since } } });
}
