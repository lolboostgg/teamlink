"use client";

import { useCallback, useState } from "react";
import type { DispatchOrder } from "@/lib/matchmaking/types";
import { useLiveSync } from "@/lib/events/useLiveSync";

// The signed-in account's order history (any status), newest first. The API
// scopes clients by clientUserId and teammates by their selected candidacy.
export function useAllOrders(): DispatchOrder[] {
  return useAllOrdersState().orders;
}

export function useAllOrdersState(): { orders: DispatchOrder[]; loading: boolean } {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dispatch/orders", { cache: "no-store" });
      // Thrown, not swallowed — usePoll backs off on a rejection instead of
      // hammering an API that is already failing.
      if (!res.ok) throw new Error(`Orders request failed: ${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } finally {
      // Even a failed first attempt ends the loading state: the UI should
      // show its empty state rather than spin forever.
      setLoading(false);
    }
  }, []);

  useLiveSync("orders", refresh, 3000);

  return { orders, loading };
}
