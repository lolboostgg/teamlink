"use client";

import Link from "next/link";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { BookingsTable } from "@/components/dashboard/client/BookingsTable";

// Full order history for this browser — every real order created via
// checkout, not a static mock list. See useAllOrders().
export function OrdersHistoryPanel() {
  const orders = useAllOrders();

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
