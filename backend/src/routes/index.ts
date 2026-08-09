import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { supportRouter } from './support.routes.js';
import { meRouter } from './me.routes.js';
import { brandingRouter } from './branding.routes.js';
import { billsRouter } from './bills.routes.js';
import { notifyRouter } from './notify.routes.js';
import { eventsRouter } from './events.routes.js';
import { driversRouter } from './drivers.routes.js';
import { restoreRouter } from './restore.routes.js';
import { customersRouter } from './customers.routes.js';
import { tripsRouter } from './trips.routes.js';
import { tripEditRequestsRouter } from './tripEditRequests.routes.js';
import { vehiclesRouter } from './vehicles.routes.js';
import { requireAuth, blockIfFrozen } from '../middleware/auth.js';
import { notFound } from '../middleware/errorHandler.js';
import { checkDbBreaker } from '../middleware/dbCircuitBreaker.js';
import { globalApiLimiter } from '../middleware/rateLimit.js';

export const apiRouter = Router();

// Health check bypasses both — Render's own liveness probe must never be blocked by database
// trouble or request volume, since a healthy-but-DB-down process restarting in a loop would only
// make things worse.
apiRouter.use(healthRouter);
apiRouter.use(globalApiLimiter);
apiRouter.use(checkDbBreaker());
apiRouter.use('/auth', authRouter);
// Cross-tenant, password-gated — deliberately mounted here, before the per-business
// requireAuth() gate below, since it verifies its own separate support token instead.
apiRouter.use('/support', supportRouter);

// Everything below requires a valid session token.
apiRouter.use(requireAuth());
// /me and /events stay reachable even while frozen — /me is how the frontend learns it's frozen
// in the first place, and /events is the SSE channel the unfreeze push arrives on. Every other
// route is blocked below.
apiRouter.use('/me', meRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use(blockIfFrozen());
apiRouter.use('/branding', brandingRouter);
apiRouter.use('/bills', billsRouter);
apiRouter.use('/notify', notifyRouter);
apiRouter.use('/drivers', driversRouter);
apiRouter.use('/restore', restoreRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/trips', tripsRouter);
apiRouter.use('/trip-edit-requests', tripEditRequestsRouter);
apiRouter.use('/vehicles', vehiclesRouter);

apiRouter.use(notFound);
