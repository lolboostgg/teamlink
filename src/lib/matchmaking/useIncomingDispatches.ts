"use client";

import { useEffect, useState } from "react";
import {
  CURRENT_TEAMMATE_ID,
  DISPATCH_WINDOW_MS,
  listActiveOrders,
  respondToCandidate,
  startOrder,
  completeOrder,
  subscribeToDispatch,
} from "@/lib/matchmaking/store";
import type { DispatchOrder } from "@/lib/matchmaking/types";

// Teammate-side view, scoped to the fixed demo identity (Nova) — see
// CURRENT_TEAMMATE_ID in store.ts. Pending invites are orders where Nova is
// a candidate still awaiting a response; active orders are ones assigned to
// her that are in progress or ready to start.
export function useIncomingDispatches() {
  const [orders, setOrders] = useState<DispatchOrder[]>(() => listActiveOrders());

  useEffect(() => {
    function refresh() {
      setOrders(listActiveOrders());
    }
    refresh();
    const unsubscribe = subscribeToDispatch(refresh);
    const interval = setInterval(refresh, 1000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const pendingInvites = orders.filter((o) =>
    o.candidates.some((c) => c.teammateId === CURRENT_TEAMMATE_ID && c.status === "pending"),
  );

  const activeOrders = orders.filter(
    (o) => o.selectedTeammateId === CURRENT_TEAMMATE_ID && (o.status === "assigned" || o.status === "in_progress"),
  );

  return {
    pendingInvites,
    activeOrders,
    dispatchWindowMs: DISPATCH_WINDOW_MS,
    respond: (orderId: string, accept: boolean) => {
      const updated = respondToCandidate(orderId, CURRENT_TEAMMATE_ID, accept);
      if (updated) setOrders(listActiveOrders());
    },
    start: (orderId: string) => {
      startOrder(orderId);
      setOrders(listActiveOrders());
    },
    complete: (orderId: string) => {
      completeOrder(orderId);
      setOrders(listActiveOrders());
    },
  };
}
