// Local "outbox" for trip submissions made while the app can't reach the server (driver out of
// signal, admin's PC/tunnel briefly down, etc.). Survives app restarts since it's just localStorage.
const QUEUE_KEY = 'shivam_pending_trips';

export interface QueuedTrip {
  localId: string;
  queuedAt: string;
  payload: Record<string, unknown>;
}

function readQueue(): QueuedTrip[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedTrip[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueuedTrips(): QueuedTrip[] {
  return readQueue();
}

export function enqueueTrip(payload: Record<string, unknown>): QueuedTrip {
  const queue = readQueue();
  const item: QueuedTrip = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    payload,
  };
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function removeQueuedTrip(localId: string) {
  writeQueue(readQueue().filter(item => item.localId !== localId));
}

export function getQueueCount(): number {
  return readQueue().length;
}

// One of these is generated per trip submission and sent as `clientRequestId` on every attempt
// (the initial POST and every retry out of the offline queue) — the server uses it to recognize
// a retry of a submission that actually succeeded but whose response the client never saw
// (dropped connection right after the server committed), instead of creating a duplicate trip.
// `crypto.randomUUID()` needs a secure context (HTTPS/localhost) and this app deliberately also
// supports plain-HTTP LAN access (drivers hitting a laptop's LAN IP directly), so this falls back
// to a plain unique string there — it only needs to be unique, not cryptographically random.
export function generateClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through to the manual fallback below
    }
  }
  return `crid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
