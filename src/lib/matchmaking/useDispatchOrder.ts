"use client";

import { useEffect, useState } from "react";
import {
  cancelOrder,
  confirmSelection,
  getOrder,
  subscribeToDispatch,
  DISPATCH_WINDOW_MS,
} from "@/lib/matchmaking/store";
import type { DispatchOrder } from "@/lib/matchmaking/types";

// Customer-side view of one order. Re-reads from localStorage on every
// BroadcastChannel push (a teammate accepting/declining in another tab) and
// on a 1s tick, since simulated candidates and deadlines need to advance
// even with no cross-tab messages at all.
export function useDispatchOrder(orderId: string | null) {
  const [order, setOrder] = useState<DispatchOrder | null>(() => (orderId ? getOrder(orderId) : null));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!orderId) return;
    const id = orderId;
    function refresh() {
      setOrder(getOrder(id));
      setNow(Date.now());
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
    order?.sessionStartAt != null ? Math.max(0, Math.floor((now - order.sessionStartAt) / 1000)) : 0;

  return {
    order,
    now,
    dispatchSecondsLeft,
    selectionSecondsLeft,
    sessionElapsedSeconds,
    dispatchWindowMs: DISPATCH_WINDOW_MS,
    confirmSelection: (teammateId: string) => orderId && setOrder(confirmSelection(orderId, teammateId)),
    cancelOrder: () => orderId && setOrder(cancelOrder(orderId)),
  };
}
