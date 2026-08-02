"use client";

import { useEffect, useState } from "react";
import { listAllOrders, subscribeToDispatch } from "@/lib/matchmaking/store";
import type { DispatchOrder } from "@/lib/matchmaking/types";

// Full order history for the current browser (any status), newest first —
// powers the client dashboard (overview stats, order history, chat/
// favorites derived from real matched teammates) instead of static mock
// data. Same poll + BroadcastChannel pattern as the rest of the matchmaking
// hooks, just reading everything instead of only the active subset.
export function useAllOrders(): DispatchOrder[] {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);

  useEffect(() => {
    function refresh() {
      setOrders(listAllOrders());
    }
    refresh();
    const unsubscribe = subscribeToDispatch(refresh);
    const interval = setInterval(refresh, 2000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return orders;
}
