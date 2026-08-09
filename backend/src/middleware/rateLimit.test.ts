// Render (and any reverse-proxy host) terminates TLS and forwards requests to this app over a
// private connection — every request arrives from the proxy's own IP unless the app trusts the
// `X-Forwarded-For` header it sets. Without `app.set('trust proxy', 1)` (see app.ts), the
// rate-limiter's per-IP bucketing either collapses every real visitor into one shared bucket
// (locks everyone out together after one person trips it) or, worse, keys on a header an
// attacker can forge to reset their own quota at will. This test builds a minimal app — no
// Prisma/DB involved — so it isolates that one behavior rather than exercising the full API.
import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { rateLimiter } from './rateLimit.js';

function buildTestApp(trustProxy: boolean) {
  const app = express();
  if (trustProxy) app.set('trust proxy', 1);
  app.use(rateLimiter(2, 60_000, 'Too many requests'));
  app.get('/ping', (req, res) => res.json({ ip: req.ip }));
  return app;
}

describe('rate limiter + trust proxy', () => {
  it('with trust proxy enabled, gives each forwarded IP its own quota', async () => {
    const app = buildTestApp(true);

    // Two different "visitors" arriving through the same proxy, distinguished only by the
    // X-Forwarded-For header a real reverse proxy would set.
    for (let i = 0; i < 2; i++) {
      const res = await request(app).get('/ping').set('X-Forwarded-For', '203.0.113.10');
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).get('/ping').set('X-Forwarded-For', '203.0.113.10');
    expect(blocked.status).toBe(429);

    // A second visitor's own quota is untouched by the first visitor's requests.
    const otherVisitor = await request(app).get('/ping').set('X-Forwarded-For', '203.0.113.20');
    expect(otherVisitor.status).toBe(200);
  });

  it('with trust proxy disabled, every forwarded IP collapses into one shared bucket', async () => {
    const app = buildTestApp(false);

    // Same two distinct X-Forwarded-For values as above, but since trust proxy is off, Express
    // ignores the header entirely and req.ip is always the (single, local) socket address —
    // this is the exact regression this test exists to catch if `trust proxy` is ever removed.
    const first = await request(app).get('/ping').set('X-Forwarded-For', '203.0.113.10');
    const second = await request(app).get('/ping').set('X-Forwarded-For', '203.0.113.20');
    expect(first.body.ip).toBe(second.body.ip);

    const third = await request(app).get('/ping').set('X-Forwarded-For', '203.0.113.30');
    // Third request total against the shared bucket (limit is 2) — blocked regardless of the
    // spoofed header, proving the two "different visitors" above were never actually separated.
    expect(third.status).toBe(429);
  });
});
