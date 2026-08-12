"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

let stateRequest: Promise<StateResponse> | null = null;

async function fetchDispatchState(): Promise<StateResponse> {
  if (stateRequest) return stateRequest;
  stateRequest = (async () => {
    const res = await fetch("/api/dispatch/state", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Could not load your live dispatch status.");
    }
    return res.json() as Promise<StateResponse>;
  })().finally(() => {
    stateRequest = null;
  });
  return stateRequest;
}

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

// Several dashboard components consume the same dispatch state at once
// (global DispatchFlow, request list, active-order card). Each hook instance
// used to start its own heartbeat, so one tab wrote lastSeen three times per
// interval and several open tabs multiplied that again. One shared loop per
// browser tab is enough to prove that the dashboard is present.
let heartbeatConsumers = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function beatPresence() {
  void fetch("/api/dispatch/heartbeat", { method: "POST", keepalive: true }).catch(() => undefined);
}

function retainHeartbeat() {
  heartbeatConsumers += 1;
  if (heartbeatTimer) return;
  beatPresence();
  heartbeatTimer = setInterval(beatPresence, HEARTBEAT_MS);
}

function releaseHeartbeat() {
  heartbeatConsumers = Math.max(0, heartbeatConsumers - 1);
  if (heartbeatConsumers > 0 || !heartbeatTimer) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

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
      const data = await fetchDispatchState();
      setFetchedAt(Date.now());
      setState({ ...EMPTY, ...data });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not reach live dispatch. Reconnecting...");
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
    retainHeartbeat();
    return releaseHeartbeat;
  }, [enabled]);

  // Local interpolation between polls.
  //
  // Every countdown handed to a component is `server value − time since we
  // read it`, measured against the wall clock rather than counted down tick
  // by tick. That distinction is the whole point: a browser clamps timers in
  // a hidden tab to about once a minute, so anything that decrements per tick
  // freezes the moment a teammate alt-tabs into their game and is still
  // showing "12s" when they come back to a wave that lapsed ten seconds ago.
  // Clicking Accept on that number is what produced "this request timed out"
  // with time apparently still on the clock. Read off Date.now(), the first
  // render after the tab wakes is already correct.
  const [now, setNow] = useState(() => Date.now());
  const counting = urgent || state.requests.length > 0;
  useEffect(() => {
    if (!counting) return;
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 100);
    // A hidden tab gets no ticks worth having; this is what makes the number
    // right on the frame the tab is looked at again, before the refetch that
    // usePoll fires has even come back.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [counting]);

  const sinceRead = fetchedAt ? Math.max(0, now - fetchedAt) : 0;
  const msLeft = urgent && fetchedAt ? Math.max(0, state.msLeft - sinceRead) : state.msLeft;

  // The open-request clocks were the one set this never touched: each card
  // got the raw figure from the last poll and ran its own counter off it.
  //
  // Quantised to a quarter second so this rebuilds four times a second
  // rather than ten: the cards only ever print whole seconds, and each one is
  // a good deal of markup to re-render for a digit that has not moved.
  const sinceReadCoarse = Math.floor(sinceRead / 250) * 250;
  const requests = useMemo(
    () =>
      fetchedAt
        ? state.requests.map((request) => ({ ...request, msLeft: Math.max(0, request.msLeft - sinceReadCoarse) }))
        : state.requests,
    [state.requests, sinceReadCoarse, fetchedAt],
  );

  return {
    ...state,
    msLeft,
    requests,
    /** When the server was last read — a timestamp callers can date live
     * dispatch state by without reaching for a clock during render. */
    fetchedAt,
    loaded: fetchedAt > 0,
    error,
    setError,
    refresh: load,
  };
}
