"use client";

import { useEffect, useState } from "react";
import {
  cancelOrder,
  confirmMultiSelection,
  confirmSelection,
  getOrder,
  requestCancelSession,
  subscribeToDispatch,
  updatePreferences,
  DISPATCH_WINDOW_MS,
  SELECTION_WINDOW_MS,
} from "@/lib/matchmaking/store";
import type { DispatchOrder } from "@/lib/matchmaking/types";

// Customer-side view of one order. Re-reads from localStorage on every
// BroadcastChannel push (a teammate accepting/declining in another tab) and
// on a 1s tick, since simulated candidates and deadlines need to advance
// even with no cross-tab messages at all.
export function useDispatchOrder(orderId: string | null) {
  // Hydration-safe: getOrder() reads localStorage, which doesn't exist
  // server-side, so seeding this from it during the initial render would
  // make the client's first paint diverge from the SSR markup. Start null
  // (matches what the server rendered) and load the real value in the
  // effect below instead — same pattern as AuthModalProvider's auth flag.
  const [order, setOrder] = useState<DispatchOrder | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Distinguishes "still loading from localStorage" from "genuinely no such
  // order" — both render order===null, but only the latter should ever show
  // a "not found" message instead of a loading state.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const id = orderId;
    function refresh() {
      setOrder(getOrder(id));
      setNow(Date.now());
      setLoaded(true);
    }
    refresh();
    const unsubscribe = subscribeToDispatch(refresh);
    const interval = setInterval(refresh, 1000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [orderId]);

  const dispatchSecondsLeft = order ? Math.max(0, Math.ceil((order.dispatchDeadline - now) / 1000)) : 0;
  const selectionSecondsLeft =
    order?.selectionDeadline != null ? Math.max(0, Math.ceil((order.selectionDeadline - now) / 1000)) : 0;
  const sessionElapsedSeconds =
    order?.assignedAt != null ? Math.max(0, Math.floor((now - order.assignedAt) / 1000)) : 0;
  const searchElapsedSeconds = order ? Math.max(0, Math.floor((now - order.createdAt) / 1000)) : 0;

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
    confirmSelection: (teammateId: string) => orderId && setOrder(confirmSelection(orderId, teammateId)),
    confirmMultiSelection: (teammateIds: string[]) => orderId && setOrder(confirmMultiSelection(orderId, teammateIds)),
    cancelOrder: () => orderId && setOrder(cancelOrder(orderId)),
    requestCancelSession: () => orderId && setOrder(requestCancelSession(orderId)),
    updatePreferences: (prefs: { vibe?: string; conversationPref?: string; playStylePref?: string }) =>
      orderId && setOrder(updatePreferences(orderId, prefs)),
  };
}
