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
