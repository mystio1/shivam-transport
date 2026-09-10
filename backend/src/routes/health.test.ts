// GET /health is what Render's Health Check Path and any external uptime monitor hit — this
// test exists to catch a regression where it stops being reachable, requires auth, or starts
// depending on the database (see app.ts: it's mounted before every other middleware).
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { buildApp } from '../app.js';

describe('GET /health', () => {
  it('returns 200 with a minimal ok status, no auth required', async () => {
    const app = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
