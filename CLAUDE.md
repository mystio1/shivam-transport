# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

Customer/trip/billing management for a small Indian transport business. Each business ("group") has one admin (runs the server on their PC) and N drivers who connect from phones over LAN, a Cloudflare Tunnel, or the hosted Render deployment. Drivers submit trip details; admin approves and generates bills. Live production app is at https://shivam-transport.onrender.com/.

## Commands

All commands run from the repo root.

**Daily development (admin's PC):**
- `npm install` — first-time setup
- `npm run dev` — Vite dev server on http://localhost:5173 (hot reload, no API)
- `npm run server` — run the legacy backend (`backend/server.mjs`) on port 4000 (serves built frontend + JSON file DB)
- `npm run start` — `npm run build` + run the backend under `backend/supervisor.mjs` (auto-restarts on crash, exponential backoff up to 30s). This is what production-equivalent local runs look like.

**Backend v2 (Express + Prisma + Postgres):**
- `npm run server:v2:dev` — `tsx watch` on `backend/src/index.ts`
- `npm run build:backend` — tsc to `backend/dist/`
- `npm run server:v2` — build + run `backend/dist/index.js` (Render's `startCommand`)
- `npm run migrate:json-to-postgres` — one-time data migration from the legacy JSON DB

**Tests, lint, build:**
- `npm test` — `vitest run` (uses the existing `*.test.ts` files in `backend/src/`)
- `npm run test:watch` — vitest watch mode
- `npm run lint` — ESLint flat config (`eslint.config.js`) over the whole tree
- `npm run build` — `tsc -b && vite build` (frontend; backend builds separately)

**Mobile app sync:**
- `npm run mobile:sync` — `npm run build && cap sync`; then open `android/` in Android Studio or `ios/` in Xcode

**Tests run against a real Postgres** — the CI workflow (`.github/workflows/ci.yml`) provisions a `postgres:16` service container and runs `prisma migrate deploy` before `npm test`. Locally you need `DATABASE_URL`/`DIRECT_URL` pointing at a Postgres (matching the Supabase dual-string shape) before tests will pass.

**Deployment:** `.github/workflows/ci.yml` runs lint/build/test in parallel; on `main`/`master` pushes, if all three pass, it POSTs to the Render Deploy Hook URL (configured as `RENDER_DEPLOY_HOOK_URL` in GitHub secrets). `render.yaml` has `autoDeploy: false` so a broken build can never reach Render without going through CI first.

## Backend architecture

The repo has **two parallel backends** sharing the same API surface:

1. **`backend/server.mjs`** — legacy single-file Node HTTP server with a JSON-file DB (`backend/data/db.json`). No external deps; what `npm run server` and `npm run start` run. The supervisor (`backend/supervisor.mjs`) wraps it for auto-restart.
2. **`backend/src/`** — newer rewrite: Express 5 + Prisma 7 + Postgres (Supabase), structured as routes → repositories → Prisma. What `npm run server:v2` runs (this is what Render actually deploys — see `render.yaml` `startCommand`).

Both backends intentionally expose the same `/api/*` routes, same response shapes, and same Bearer-token auth — the frontend doesn't know which it's talking to. When working on an API endpoint, check whether the change needs to be applied to BOTH files or only to `backend/src/` (the legacy file is frozen and only kept for local-fallback).

**v2 layout** (`backend/src/`):
- `app.ts` — `buildApp()` factory (no `.listen()`, supertest-mountable), mounts security headers, CORS, JSON body, `/api` router, static files, error handler
- `index.ts` — calls `buildApp()` and `.listen()` (only place that does)
- `env.ts` — first import in the tree; loads dotenv, reads `process.env`, holds the `config` singleton. Fallback `SESSION_SECRET` written to `backend/data/.session_secret` locally so restarts don't invalidate sessions
- `routes/index.ts` — the API router. Mounts `/auth` and `/support` before `requireAuth()`, then `requireAuth()` → `/me` + `/events` (reachable while frozen) → `blockIfFrozen()` → everything else. Order matters: frozen accounts can only read `/me` and the SSE channel
- `routes/*.routes.ts` — one file per resource (auth, trips, customers, bills, branding, etc.)
- `middleware/auth.ts` — `requireAuth()` (verifies HMAC token + looks up Session row for revocation + fetches User), `requireRole()`, `blockIfFrozen()`. Bearer token from `Authorization` header OR `?token=` query param (query param exists because the browser's native `EventSource` can't set custom headers)
- `middleware/dbCircuitBreaker.ts` — fails fast (503 with `Retry-After`) when Postgres is having trouble; trips only on `P1001/P1002/P1008/P1017`, NOT on `P2002` (which means the DB answered correctly)
- `middleware/security.ts` — helmet with a custom CSP (`connect-src *` because the app can be pointed at any backend URL)
- `middleware/errorHandler.ts` — terminal error handler. `HttpError` class for expected 4xx; correlation IDs for 5xx so incidents can be traced back to logs
- `middleware/rateLimit.ts` — `express-rate-limit` with the proven `signup: 8/hr, login: 5/min, forgot-password: 5/hr, reset-password: 10/hr, email: 10/hr` buckets from the legacy server
- `services/sessionTokens.ts` — stateless HMAC-signed tokens (30-day expiry), secret passed in for testability
- `services/authSession.ts` — `issueSession()` records the token's hash in the `Session` table so password-reset can revoke via `sessionsRepo.revokeAllForUser`. Signature is still self-contained for fast validation
- `services/sse.ts` — in-memory `Map<groupCode, Set<Response>>`; `broadcast()` pushes `data-changed` / `trip-submitted` / `trip-updated` / `account-frozen` events to every connected client in the tenant group
- `services/mailer.ts` — lazily-built nodemailer transporter for Gmail SMTP; returns `null` when env vars unset (email features degrade gracefully)
- `db/prisma.ts` — the ONLY place `PrismaClient` is constructed. Uses `@prisma/adapter-pg` (Prisma 7 driver adapter), pointed at `DATABASE_URL` (the POOLED Supabase string, port 6543) with `max: 10, connectionTimeoutMillis: 10_000`. Exports `DbClient` type so every repo function can accept either the singleton or a transaction client (`prisma.$transaction((tx) => ...)`)
- `db/repositories/*.repository.ts` — one per entity (users, groups, customers, trips, bills, vehicles, auditLogs, sessions, branding, restore, tripEditRequests). All repo functions take `client: DbClient = prisma` and use `where: { id, groupId }` lookups so one tenant can never touch another's rows
- `prisma/schema.prisma` — `provider = "postgresql"`, no URL in the schema (Prisma 7 moved it to `prisma.config.ts`). `Group` is the tenant boundary; every other entity has `groupId` and `@@index([groupId])`. `Customer` has `@@unique([groupId, name])` (case-sensitive at the DB level — case-insensitive matching is in the repository) which `customers.repository.ts:findOrCreate` relies on via the catch-and-refetch pattern for the race
- `prisma/migrations/` — applied by hand against `DIRECT_URL` (Supabase's pooler can't handle `prisma migrate deploy`'s advisory locks — see the comment in `render.yaml` and `prisma/schema.prisma`). `render.yaml`'s `buildCommand` deliberately does NOT run migrations

**Dual Postgres URL pattern (Supabase):** `DATABASE_URL` (port 6543, `?pgbouncer=true`) for runtime queries through the pooler; `DIRECT_URL` (port 5432) for migrations. Both point at the same database. CI uses identical URLs since there's no pooler. See `prisma.config.ts` and the comments in `.env.example`.

**Cross-tenant support console:** `SUPPORT_ACCESS_PASSWORD` env var enables `routes/support.routes.ts` (disabled entirely if unset — endpoints return 404). Issues a separate 4-hour HMAC-signed support token (distinct HMAC input so it can't be confused with a normal session token). Operations: list all businesses, freeze/unfreeze (pushes SSE event to every device on that group), set per-tenant seat caps (`maxDrivers`, `maxAdmins`, `maxBillsPerDay`), impersonate (issues a REAL session token so the rest of the app needs no special-casing). The frontend entry point is `pages/SupportConsole.tsx`, mounted at `/support` and explicitly bypassing the normal auth flow in `App.tsx`.

## Frontend architecture

- **Stack:** React 19 + TypeScript + Vite + MUI v7 (`@mui/material`, `@mui/lab`, `@mui/x-date-pickers`) + `recharts` (admin dashboard charts) + `jspdf`/`html2canvas` (bill rendering). React Router with `HashRouter` (works under the `file://`-style Capacitor WebView and any subpath)
- **State:** everything goes through `src/context/AppContext.tsx`. One `AppProvider`, one `useAppContext()` hook, ~40 action methods. Backend calls all go through a single `apiRequest()` helper that attaches the Bearer token and parses JSON; `ApiError` distinguishes "server rejected" from "fetch threw" so `submitDriverTrip` can decide "queue for later" vs "surface the error"
- **Auth/session:** token stored in `localStorage` (`TOKEN_KEY`); `ME_CACHE_KEY` holds a snapshot of `/api/me` so cold-start can render UI instantly without waiting on Render's free-tier wake-up. Session restored on mount; data re-fetched on `user?.id` change (NOT `user` — see the comment about reconnect-storms)
- **Real-time:** `EventSource` on `/api/events?token=...` (query param because EventSource can't set headers). Listens for `data-changed` / `trip-submitted` / `trip-updated` → `refreshData()`, and `account-frozen` / `account-unfrozen` → `setGroup(...)`. The `connected` event re-fetches `/api/me` on every reconnect so changes during a dropped connection are picked up automatically
- **Offline queue:** `src/utils/offlineQueue.ts` — driver trip submissions made while the server is unreachable are saved to `localStorage` under `shivam_pending_trips`. Flushed on `online` event, on every successful submission (opportunistic), and on a 20s interval. Each submission carries a `clientRequestId` (UUID or fallback string — `crypto.randomUUID` needs HTTPS) used by the server to recognize retries and avoid duplicates (`@@unique([groupId, clientRequestId])` in schema)
- **Routing (`src/App.tsx`):** HashRouter → `/support` (standalone, no session) → everything else wrapped in `ClientApp` which gates on `user`. Admin and driver have completely separate route trees. Unmatched paths redirect home (no 404 page)
- **Theme:** MUI `ThemeProvider` with a Binance-inspired palette (gold `#F0B90B` primary, dark default); light/dark toggle persisted to `localStorage`
- **Bill rendering:** client-side via `jspdf` + `html2canvas` (no server PDF gen); `src/utils/billPdf.ts`. PDF download and WhatsApp share both call `POST /api/bills/generation` first so the support-set daily bill limit can't be bypassed (the `save to My Bills` path enforces the same limit on `POST /api/bills`)
- **Document reminders:** in-app bell + native push (Capacitor `LocalNotifications`); snooze/dismiss preferences stored per-document-id in `localStorage`, pinned to the document's current `expiryDate` so renewing a document makes the stored pref stop matching automatically

## Important conventions

- **Tenant boundary:** every repository lookup uses `where: { id, groupId }` (not just `id`) so one business can never touch another's rows. New routes must enforce this
- **Audit logging:** write actions call `auditLogsRepo.create(prisma, user, groupId, action, entityId, details?)`. Frozen-account actions are blocked server-side, not just frontend-side
- **Bills and advance payments** are split into soft delete (`bill.deleted` flag, kept in record) and permanent delete (separate `/permanent` endpoint). Same pattern for advance entries
- **Trip edit by drivers:** pending trips can be edited directly by their submitting driver; approved trips require a `TripEditRequest` (POST `/api/trips/:id/edit-requests`) that an admin resolves. This is enforced both server-side and reflected in the editable-fields list per role
- **Decimal money:** `Decimal(12, 2)` in Prisma; `toNumber()` (in `src/utils` mirror and `backend/src/services/util.ts`) for any arithmetic, `.toFixed(2)` only for display
- **`clientRequestId` on trips:** nullable + `@@unique([groupId, clientRequestId])` — admin-direct trips (no offline risk) don't send it
- **CSP:** `connect-src *` is intentional — the app's backend URL is dynamic (LAN IP / tunnel / custom); not knowable in advance. Don't tighten this without first hardcoding a default origin
- **Rate limits and the `HttpError` class:** the legacy server used `send(res, status, {message})` everywhere; the v2 port is `throw new HttpError(status, message, code?)` — terminal error handler converts. When adding 4xx, prefer throwing `HttpError` over writing JSON inline
- **`requireAuth` runs once at the API router level** (in `routes/index.ts`), then per-resource routers don't re-check. `requireRole` is the per-handler role gate

## Where things live (quick index)

- API contracts: `backend/server.mjs` (legacy) and `backend/src/routes/*.routes.ts` (v2)
- Domain rules: `backend/src/services/serializers.ts` (Prisma → wire shape), `backend/src/db/repositories/*` (data access)
- Frontend types: `src/types/index.ts` — wire shapes must match the serializers' output
- Frontend action methods: `src/context/AppContext.tsx` (every mutation, including SSE handling)
- Bill PDF generation: `src/utils/billPdf.ts` (client-side, html2canvas + jspdf)
- Offline-queue + retry: `src/utils/offlineQueue.ts` + the `submitDriverTrip`/`flushPendingTrips` flow in `AppContext`
- Public tunnel setup: `CLOUDFLARE_TUNNEL.md` (referenced by admin in deployment, not at runtime)
- Mobile native projects: `android/` and `ios/` (synced from the frontend build by `npm run mobile:sync`)
