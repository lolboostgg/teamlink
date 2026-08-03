"use client";

import Link from "next/link";
import { useAllOrdersState } from "@/lib/matchmaking/useAllOrders";
import { BookingsTable } from "@/components/dashboard/client/BookingsTable";

// Full order history for this browser — every real order created via
// checkout, not a static mock list. See useAllOrders().
export function OrdersHistoryPanel() {
  const { orders, loading } = useAllOrdersState();

  if (loading) {
    return (
      <div className="dashboard-empty dashboard-empty--loading" aria-live="polite">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <p>Loading your orders…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
        <p>No orders yet.</p>
        <Link href="/games" className="btn btn--vivid btn--sm">
          Book a teammate
        </Link>
      </div>
    );
  }

  return <BookingsTable orders={orders} />;
}
