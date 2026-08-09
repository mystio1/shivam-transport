import type { Response } from 'express';

// Real-time push to every connected client in a tenant group — ported verbatim from
// backend/server.mjs's clientsByGroup/broadcast. Express doesn't change anything about
// res.write()-based SSE (same underlying http.ServerResponse), so this is a direct port.
const clientsByGroup = new Map<string, Set<Response>>();

export function subscribe(groupCode: string, res: Response): void {
  if (!clientsByGroup.has(groupCode)) clientsByGroup.set(groupCode, new Set());
  clientsByGroup.get(groupCode)!.add(res);
}

export function unsubscribe(groupCode: string, res: Response): void {
  clientsByGroup.get(groupCode)?.delete(res);
}

export function broadcast(groupCode: string, event: string, payload: unknown): void {
  const clients = clientsByGroup.get(groupCode);
  if (!clients) return;
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(data);
}
