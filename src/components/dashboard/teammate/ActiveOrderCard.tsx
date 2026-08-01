"use client";

import Link from "next/link";
import { PriceTag } from "@/components/currency/PriceTag";
import { useIncomingDispatches } from "@/lib/matchmaking/useIncomingDispatches";

export function ActiveOrderCard() {
  const { activeOrders, start, complete } = useIncomingDispatches();

  if (activeOrders.length === 0) return null;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Active order</div>
          <div className="dashboard-panel__sub">Assigned to you via the live dispatch flow</div>
        </div>
      </div>
      <div className="dashboard-list">
        {activeOrders.map((order) => (
          <div className="dashboard-list-item" key={order.id}>
            <div className="dashboard-list-item__meta">
              <div className="dashboard-list-item__title">
                {order.gameName} · {order.option}
              </div>
              <div className="dashboard-list-item__sub">
                {order.customerLabel} · <PriceTag amountEUR={order.priceEUR} /> ·{" "}
                <span className={`dashboard-pill ${order.status === "in_progress" ? "dashboard-pill--success" : "dashboard-pill--warning"}`}>
                  {order.status === "in_progress" ? "In progress" : "Ready to start"}
                </span>
              </div>
            </div>
            <div className="notification-panel__actions">
              {order.status === "assigned" && (
                <button type="button" className="btn btn--sm btn--vivid" onClick={() => start(order.id)}>
                  Start order
                </button>
              )}
              {order.status === "in_progress" && (
                <button type="button" className="btn btn--sm btn--vivid" onClick={() => complete(order.id)}>
                  Complete order
                </button>
              )}
              <Link href="/dashboard/teammate/chat" className="btn btn--sm btn--ghost">
                Message customer
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
