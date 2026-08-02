"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PriceTag } from "@/components/currency/PriceTag";
import { getTeammateById } from "@/lib/teammates";
import { cancelOrder, listActiveOrders, subscribeToDispatch } from "@/lib/matchmaking/store";
import type { DispatchOrder, OrderStatus } from "@/lib/matchmaking/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  searching: "Searching",
  candidates_ready: "Dispatching",
  selecting: "Choose your teammate",
  assigned: "Matched",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_match: "No match found",
};

const STATUS_PILL: Record<OrderStatus, string> = {
  searching: "dashboard-pill--warning",
  candidates_ready: "dashboard-pill--warning",
  selecting: "dashboard-pill--warning",
  assigned: "dashboard-pill--success",
  in_progress: "dashboard-pill--success",
  completed: "dashboard-pill--muted",
  cancelled: "dashboard-pill--muted",
  no_match: "dashboard-pill--muted",
};

// Sourced from the live matchmaking store, separate from the static
// CLIENT_BOOKINGS mock history — this shows orders currently moving
// through the dispatch flow started from this browser.
export function LiveOrdersPanel() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);

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

  if (orders.length === 0) return null;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Live orders</div>
          <div className="dashboard-panel__sub">Currently moving through the live dispatch flow</div>
        </div>
      </div>
      <div className="dashboard-list">
        {orders.map((order) => {
          const teammate = order.selectedTeammateId ? getTeammateById(order.selectedTeammateId) : null;
          const cancellable = order.status === "candidates_ready" || order.status === "selecting";
          return (
            <div className="dashboard-list-item" key={order.id}>
              <div className="dashboard-list-item__meta">
                <div className="dashboard-list-item__title">
                  {order.gameName} · {order.option}
                </div>
                <div className="dashboard-list-item__sub">
                  <PriceTag amountEUR={order.priceEUR} />
                  {teammate ? ` · ${teammate.name}` : ""} ·{" "}
                  <span className={`dashboard-pill ${STATUS_PILL[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                </div>
              </div>
              <div className="notification-panel__actions">
                {cancellable && (
                  <>
                    <Link href={`/checkout/matching?order=${order.id}`} className="btn btn--sm btn--ghost">
                      View
                    </Link>
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => cancelOrder(order.id)}>
                      Cancel
                    </button>
                  </>
                )}
                {(order.status === "assigned" || order.status === "in_progress") && (
                  <Link href={`/checkout/matching?order=${order.id}`} className="btn btn--sm btn--ghost">
                    Continue
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
