"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DispatchOrder } from "@/lib/matchmaking/types";
import { useLiveSync } from "@/lib/events/useLiveSync";

// Customer-side view of one order, now served by /api/dispatch/orders/[id]
// instead of localStorage. The API hands back the same DispatchOrder shape
// the screens were written against, so this hook's contract is unchanged —
// only where the data comes from moved. Polls once a second, which is also
// what advances the server's clock-driven transitions (there's no scheduler,
// so reconcile runs on read).
export const DISPATCH_WINDOW_MS = 60_000;
export const SELECTION_WINDOW_MS = 60_000;

export function useDispatchOrder(orderId: string | null) {
  const [order, setOrder] = useState<DispatchOrder | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Difference between the server's clock and this browser's, measured on
  // every read. Without it a browser running a few seconds behind compares
  // its own Date.now() against a server timestamp, gets a negative elapsed
  // time, and shows 0:00 until it catches up — which looked exactly like a
  // timer that refuses to start.
  const skewRef = useRef(0);
  // Distinguishes "still loading" from "genuinely no such order" — both
  // render order===null, but only the latter should show "not found".
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/dispatch/orders/${orderId}`, { cache: "no-store" });
      const data = await res.json();
      setOrder(res.ok ? data.order : null);
      // Round trip included, so this reads a touch old and the timer errs
      // towards showing slightly more elapsed time rather than less. That is
      // the right way round: a search that looks a second ahead is invisible,
      // one stuck at zero is what got reported.
      if (typeof data.serverNow === "number") skewRef.current = data.serverNow - Date.now();
    } catch {
      // Keep the last good state; the next tick retries.
    } finally {
      setLoaded(true);
      setNow(Date.now() + skewRef.current);
    }
  }, [orderId]);

  useLiveSync("orders", load, 1000, { enabled: Boolean(orderId), key: orderId ?? undefined });

  // Every countdown on these screens (search elapsed, selection window,
  // reroll deadline, session clock) is derived from `now`, so it has to
  // advance on its own. Since the SSE stream slows the fallback poll to once
  // a minute while it's up, tying `now` to the fetch would freeze the timers
  // between server events.
  useEffect(() => {
    if (!orderId) return;
    const tick = setInterval(() => setNow(Date.now() + skewRef.current), 1000);
    return () => clearInterval(tick);
  }, [orderId]);

  // The clock-driven transitions (searching → candidates ready → selecting →
  // in progress) run inside reconcile() on read, and nothing publishes an
  // event for them — so while the order is still live it needs a real
  // once-a-second read, not the slowed-down fallback poll.
  const settled =
    order !== null && ["completed", "cancelled", "no_match"].includes(order.status);
  useEffect(() => {
    if (!orderId || settled) return;
    const tick = setInterval(() => void load(), 1000);
    return () => clearInterval(tick);
  }, [orderId, settled, load]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      if (!orderId) return;
      const res = await fetch(`/api/dispatch/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (typeof data.serverNow === "number") skewRef.current = data.serverNow - Date.now();
      if (res.ok && data.order) setOrder(data.order);
      else load();
    },
    [orderId, load],
  );

  const dispatchSecondsLeft = order ? Math.max(0, Math.ceil((order.dispatchDeadline - now) / 1000)) : 0;
  const selectionSecondsLeft =
    order?.selectionDeadline != null ? Math.max(0, Math.ceil((order.selectionDeadline - now) / 1000)) : 0;
  const sessionElapsedSeconds =
    order?.assignedAt != null ? Math.max(0, Math.floor((now - order.assignedAt) / 1000)) : 0;
  // Counted from the dispatch, not the order row: the order is written when
  // checkout opens, so counting from createdAt meant the search bar was
  // already half spent by the time the card went through. Both ends of this
  // are server timestamps, so the clock keeps running with the tab closed.
  const searchStartedAt = order ? (order.dispatchedAt ?? order.createdAt) : 0;
  const searchElapsedSeconds = order ? Math.max(0, Math.floor((now - searchStartedAt) / 1000)) : 0;

  return {
    order,
    now,
    loaded,
    dispatchSecondsLeft,
    selectionSecondsLeft,
    sessionElapsedSeconds,
    searchElapsedSeconds,
    dispatchWindowMs: DISPATCH_WINDOW_MS,
    selectionWindowMs: SELECTION_WINDOW_MS,
    confirmSelection: (teammateId: string) => post({ action: "select", teammateId }),
    confirmMultiSelection: (teammateIds: string[]) => post({ action: "select", teammateIds }),
    cancelOrder: () => post({ action: "cancel" }),
    requestCancelSession: () => post({ action: "request-cancel" }),
    updatePreferences: (prefs: { vibe?: string; conversationPref?: string; playStylePref?: string }) =>
      post({ action: "preferences", ...prefs }),
  };
}
