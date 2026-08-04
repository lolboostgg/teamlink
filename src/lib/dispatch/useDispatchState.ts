"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DispatchStateView } from "@/lib/dispatch/phase";
import { useLiveSync } from "@/lib/events/useLiveSync";

const EMPTY: DispatchStateView & { maxCandidates: number } = {
  phase: "OFFLINE",
  order: null,
  msLeft: 0,
  candidatePosition: null,
  isAutoSelect: false,
  acceptedCount: 0,
  maxCandidates: 5,
};

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
      const data = (await res.json()) as DispatchStateView & { maxCandidates: number };
      lastFetch.current = Date.now();
      setState({ ...EMPTY, ...data });
    } catch {
      // A dropped poll is not worth surfacing — the next tick retries.
    }
  }, [enabled]);

  const urgent =
    state.phase === "DISPATCH_INCOMING" || state.phase === "WAITING_FOR_CUSTOMER_SELECTION";

  useLiveSync("dispatch", load, urgent ? 500 : 2000, { enabled });

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
