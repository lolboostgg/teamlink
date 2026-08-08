"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DispatchStateView } from "@/lib/dispatch/phase";
import { useLiveSync } from "@/lib/events/useLiveSync";

type StateResponse = DispatchStateView & {
  maxCandidates: number;
  /** When this teammate went online, or null if they aren't. */
  availableSince: number | null;
  /** The server's own clock, so the idle timer doesn't trust the browser's. */
  serverNow: number | null;
};

const EMPTY: StateResponse = {
  phase: "OFFLINE",
  order: null,
  msLeft: 0,
  candidatePosition: null,
  isAutoSelect: false,
  acceptedCount: 0,
  requests: [],
  maxCandidates: 5,
  availableSince: null,
  serverNow: null,
};

/**
 * How often the open panel tells the server it's still there. Comfortably
 * inside the freshness window dispatch requires (lib/dispatch/create.ts), with
 * room for a background tab whose timers the browser has throttled.
 */
const HEARTBEAT_MS = 20_000;

/**
 * Polls the server for the authoritative dispatch phase. Two seconds while
 * idle, half a second while a countdown is on screen — Supabase Realtime
 * would replace this, but that needs a public anon key and RLS policies the
 * project doesn't have yet, and polling is honest about its latency.
 *
 * The countdown between polls is interpolated locally so the ring moves
 * smoothly without hammering the endpoint.
 */
export function useDispatchState(enabled = true) {
  const [state, setState] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const lastFetch = useRef(Date.now());

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/dispatch/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as StateResponse;
      lastFetch.current = Date.now();
      setState({ ...EMPTY, ...data });
    } catch {
      // A dropped poll is not worth surfacing — the next tick retries.
    }
  }, [enabled]);

  const urgent =
    state.phase === "DISPATCH_INCOMING" || state.phase === "WAITING_FOR_CUSTOMER_SELECTION";

  // Twice a second, from every teammate with the panel open, against a read
  // that now also tops up invitations — several queries each time. The push
  // channel already wakes this the instant an order is dispatched, which is
  // the moment that actually matters; these numbers only decide how long a
  // dropped stream stays stale.
  useLiveSync("dispatch", load, urgent ? 1500 : 5000, { enabled });

  // The panel heartbeat, deliberately not part of the poll above.
  //
  // Reading this endpoint is what marks the teammate as still at their desk
  // (see app/api/dispatch/state/route.ts), and dispatch only invites teammates
  // whose last read is recent. But useLiveSync drops to one poll a minute
  // while the event stream is up, and usePoll stops entirely in a background
  // tab — so a teammate sitting in their dashboard, online toggle on, went
  // stale and orders passed them by with "no one was available". A plain
  // interval keeps the beat going in both cases.
  useEffect(() => {
    if (!enabled) return;
    const beat = setInterval(() => void load(), HEARTBEAT_MS);
    return () => clearInterval(beat);
  }, [enabled, load]);

  // Local interpolation between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!urgent) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [urgent]);

  const msLeft = urgent ? Math.max(0, state.msLeft - (now - lastFetch.current)) : state.msLeft;

  return {
    ...state,
    msLeft,
    error,
    setError,
    refresh: load,
  };
}
