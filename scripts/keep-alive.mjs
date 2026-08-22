#!/usr/bin/env node
//
// keep-alive — pings the backend's /api/health on a fixed interval so Render's
// free plan never spins the service down (~15 minutes of no inbound traffic).
//
// Zero dependencies, uses the global fetch built into Node 18+. Runs forever and
// never exits on a failed ping — a dead server is precisely when it must keep trying.
//
//   node scripts/keep-alive.mjs
//   node scripts/keep-alive.mjs https://my-tunnel.example.com
//   PING_MINUTES=3 node scripts/keep-alive.mjs
//
// Run it anywhere that stays on: the office PC, a Raspberry Pi, a spare VPS, or any
// host that can run a long-lived Node process.

const DEFAULT_TARGET = 'https://shivam-transport.onrender.com';

const base = (process.argv[2] || process.env.PING_URL || DEFAULT_TARGET).replace(/\/+$/, '');
const url = `${base}/api/health`;

const minutes = Number(process.env.PING_MINUTES) || 5;
const intervalMs = minutes * 60 * 1000;

// A cold start on Render's free plan legitimately takes 50-60s, so the timeout has to
// sit well above that — a slow response IS the wake-up working, not a failure.
const TIMEOUT_MS = 90_000;

let ok = 0;
let total = 0;

function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function ping() {
  const started = Date.now();
  total++;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - started;
    if (res.ok) {
      ok++;
      // Multi-second responses mean we caught it mid-cold-start — worth flagging,
      // since that is the exact delay this script exists to prevent.
      const cold = ms > 5000 ? '  (was cold)' : '';
      console.log(`${stamp()}  OK ${res.status}  ${ms}ms${cold}   [${ok}/${total}]`);
    } else {
      console.warn(`${stamp()}  HTTP ${res.status}  ${ms}ms   [${ok}/${total}]`);
    }
  } catch (err) {
    const ms = Date.now() - started;
    console.warn(`${stamp()}  FAILED  ${ms}ms  ${err?.message || err}   [${ok}/${total}]`);
  }
}

console.log(`keep-alive → ${url}  every ${minutes} min  (ctrl+c to stop)`);
ping();
setInterval(ping, intervalMs);
