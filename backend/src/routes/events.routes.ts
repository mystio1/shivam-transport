import { Router } from 'express';
import { subscribe, unsubscribe } from '../services/sse.js';

export const eventsRouter = Router();

eventsRouter.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  const groupId = req.auth!.groupId;
  subscribe(groupId, res);
  req.on('close', () => unsubscribe(groupId, res));
});
