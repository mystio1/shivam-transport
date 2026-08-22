import { Router } from 'express';
import { now } from '../services/util.js';

export const healthRouter = Router();

// Render uses healthCheckPath: /api/health to determine if the process is alive.
// This endpoint MUST stay fast and never block on DB I/O — if the database is
// down we still want Render to see us as "up" (a healthy-but-DB-down process
// restarting would only make things worse, see routes/index.ts for context).
// The frontend's useKeepAlive hook also pings here every 4 minutes to prevent
// the free-tier server from spinning down during active use.
healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    time: now(),
    uptime: Math.floor(process.uptime()),        // seconds since server start
    memMb: Math.round(process.memoryUsage().rss / 1024 / 1024), // RSS in MB
  });
});
