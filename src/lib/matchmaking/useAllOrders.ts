"use client";

import { useEffect, useState } from "react";
import type { DispatchOrder } from "@/lib/matchmaking/types";

// The signed-in customer's order history (any status), newest first —
// powers the client dashboard's stats, order list and the chat/favorites
// derived from real matched teammates. Server-backed now, so it follows the
// account across devices instead of living in one browser's localStorage.
export function useAllOrders(): DispatchOrder[] {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/dispatch/orders", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOrders(data.orders ?? []);
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

  return orders;
}
