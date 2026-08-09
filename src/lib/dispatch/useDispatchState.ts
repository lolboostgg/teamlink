"use client";

import { useCallback, useEffect, useState } from "react";
import type { DispatchStateView } from "@/lib/dispatch/phase";
import { useLiveSync } from "@/lib/events/useLiveSync";

type StateResponse = DispatchStateView & {
  maxCandidates: number;
  /** When this teammate's current wait started — going online, or finishing
   * their last order, whichever came later. */
  waitingSince: number | null;
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
  waitingSince: null,
  serverNow: null,
};

/**
 * How often the open panel tells the server it's still there.
 *
 * Comfortably inside the freshness window dispatch requires (see waves.ts),
 * with room for a background tab whose timers the browser has throttled.
 * It used to be every 20s and it used to be the full dispatch-state read —
 * several queries per online teammate, on a timer, to write one timestamp.
 * The write has its own endpoint now, so this can be slower and costs one
 * statement when it fires.
 */
const HEARTBEAT_MS = 45_000;

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
  // When `state` was read. State rather than a ref because the countdown below
  // is computed during render, and a ref read there is both a rule violation
  // and a genuine staleness trap — a ref written after a poll doesn't re-render.
  const [fetchedAt, setFetchedAt] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/dispatch/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as StateResponse;
      setFetchedAt(Date.now());
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
  // The push channel wakes this the instant an order is dispatched, which is
  // the moment that matters. These numbers only decide how long a dropped
  // stream stays stale — and this is the heaviest read in the app, so idle
  // teammates should not be making it every twenty seconds for nothing.
  useLiveSync("dispatch", load, urgent ? 4000 : 60_000, { enabled });

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
    const beat = () => {
      void fetch("/api/dispatch/heartbeat", { method: "POST", keepalive: true }).catch(() => {
        // A missed beat is not worth surfacing. Several have to be missed
        // before it costs the teammate anything.
      });
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  // Local interpolation between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!urgent) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [urgent]);

  const msLeft = urgent && fetchedAt ? Math.max(0, state.msLeft - (now - fetchedAt)) : state.msLeft;

  return {
    ...state,
    msLeft,
    /** When the server was last read — a timestamp callers can date live
     * dispatch state by without reaching for a clock during render. */
    fetchedAt,
    error,
    setError,
    refresh: load,
  };
}
