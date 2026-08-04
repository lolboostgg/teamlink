"use client";

import { useEffect, useState } from "react";
import type { DispatchOrder } from "@/lib/matchmaking/types";

// The signed-in account's order history (any status), newest first. The API
// scopes clients by clientUserId and teammates by their selected candidacy.
export function useAllOrders(): DispatchOrder[] {
  return useAllOrdersState().orders;
}

export function useAllOrdersState(): { orders: DispatchOrder[]; loading: boolean } {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/dispatch/orders", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setOrders(data.orders ?? []);
          setLoading(false);
        }
      } catch {
        // Keep the last good list; the next tick retries.
      }
    }
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { orders, loading };
}
