// useKeepAlive — prevents the Render free-tier server from going to sleep.
//
// Render spins down a free web service after ~15 minutes of inactivity, which
// causes the next real request (e.g. the /api/me validation on app open) to hang
// for 30+ seconds while the dyno cold-starts — making the app look broken or like
// it requires re-login.
//
// This hook fires a lightweight GET /api/health ping every PING_INTERVAL_MS while:
//   • A session token exists in localStorage (user is or was logged in)
//   • The browser tab is visible (no point pinging a backgrounded tab)
//
// If the tab is hidden it pauses, and immediately fires one ping when the tab
// comes back to the foreground (catches the case where the server slept while the
// tab was backgrounded, so the user doesn't see a cold-start on their next action).
//
// Mount this once at the top of your app (e.g. inside AppProvider or App).

import { useEffect, useRef } from 'react';
import { TOKEN_KEY, getApiBase } from '../utils/serverConnection';

// 4 minutes — safely under Render's 15-minute idle threshold.
// Using fetch directly (not apiRequest) so it never throws or triggers any
// error-handling logic in the rest of the app.
const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export function useKeepAlive() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function hasToken(): boolean {
      return !!localStorage.getItem(TOKEN_KEY);
    }

    function ping() {
      // Only ping when a session exists — no point hitting the server if nobody is
      // logged in (the cold-start delay only matters for authenticated users).
      if (!hasToken()) return;
      // Fire-and-forget — we don't care about the response, and we never want this
      // to propagate an error or cause a re-render.
      fetch(`${getApiBase()}/api/health`, { method: 'GET' }).catch(() => {});
    }

    function startPinging() {
      if (timerRef.current !== null) return; // already running
      ping(); // one immediate ping when visibility returns
      timerRef.current = setInterval(ping, PING_INTERVAL_MS);
    }

    function stopPinging() {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        startPinging();
      } else {
        stopPinging();
      }
    }

    // Start immediately if the tab is already visible.
    if (document.visibilityState === 'visible') {
      startPinging();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPinging();
    };
  }, []); // runs once on mount — the interval/visibility logic handles everything inside
}
