import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Restarts backend/server.mjs whenever it exits unexpectedly (crash, killed, out-of-memory) —
// without this, a dead server sits dead until a human notices and restarts it by hand, which is
// exactly what happened twice while this app was being worked on. Backoff grows on repeated
// fast failures so a persistently broken server doesn't spin-loop forever, and resets once the
// server has stayed up for a while.
const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'server.mjs');
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const HEALTHY_UPTIME_MS = 60000;

let restartDelay = MIN_DELAY_MS;
let shuttingDown = false;
let child = null;

function startServer() {
  const startedAt = Date.now();
  child = spawn(process.execPath, [serverPath], { stdio: 'inherit', env: process.env });

  child.on('exit', (code, signal) => {
    child = null;
    if (shuttingDown) return;

    const uptime = Date.now() - startedAt;
    restartDelay = uptime >= HEALTHY_UPTIME_MS ? MIN_DELAY_MS : Math.min(restartDelay * 2, MAX_DELAY_MS);

    console.error(
      `\n[supervisor] server exited (code=${code}, signal=${signal}) after ${Math.round(uptime / 1000)}s — ` +
      `restarting in ${Math.round(restartDelay / 1000)}s\n`
    );
    setTimeout(startServer, restartDelay);
  });
}

function shutdown(signal) {
  shuttingDown = true;
  if (child) child.kill(signal);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('[supervisor] watching backend/server.mjs — will auto-restart it if it ever exits');
startServer();
