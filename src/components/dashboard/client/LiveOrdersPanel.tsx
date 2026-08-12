"use client";

import Link from "next/link";
import { PriceTag } from "@/components/currency/PriceTag";
import { GameMark } from "@/components/dashboard/GameMark";
import { getTeammateById } from "@/lib/teammates";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import type { OrderStatus } from "@/lib/matchmaking/types";

const LIVE_STATUSES: OrderStatus[] = [
  "searching",
  "candidates_ready",
  "selecting",
  "assigned",
  "in_progress",
  "cancel_pending",
];

async function cancelOrder(orderId: string) {
  await fetch(`/api/dispatch/orders/${orderId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel" }),
  });
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  searching: "Searching",
  candidates_ready: "Dispatching",
  selecting: "Choose your teammate",
  assigned: "Matched",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  cancel_pending: "Cancelling",
  no_match: "No match found",
};

const STATUS_PILL: Record<OrderStatus, string> = {
  awaiting_payment: "dashboard-pill--warning",
  searching: "dashboard-pill--warning",
  candidates_ready: "dashboard-pill--warning",
  selecting: "dashboard-pill--warning",
  assigned: "dashboard-pill--success",
  in_progress: "dashboard-pill--success",
  completed: "dashboard-pill--muted",
  cancelled: "dashboard-pill--muted",
  cancel_pending: "dashboard-pill--warning",
  no_match: "dashboard-pill--muted",
};

// Only the still-in-flight subset of the order history (see useAllOrders
// for the full history) — orders currently moving through the dispatch
// flow started from this browser.
export function LiveOrdersPanel() {
  const orders = useAllOrders().filter((o) => LIVE_STATUSES.includes(o.status));

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
          const teammate = order.selectedTeammateId
            ? order.candidates.find((candidate) => candidate.teammateId === order.selectedTeammateId)?.teammate ?? getTeammateById(order.selectedTeammateId)
            : null;
          const cancellable = order.status === "candidates_ready" || order.status === "selecting";
          return (
            <div className="dashboard-list-item" key={order.id}>
              <GameMark slug={order.gameSlug} />
              <div className="dashboard-list-item__meta">
                <div className="dashboard-list-item__title">{order.option}</div>
                <div className="dashboard-list-item__sub">
                  <PriceTag amountEUR={order.priceEUR} />
                  {teammate ? ` · ${teammate.name}` : ""} ·{" "}
                  <span className={`dashboard-pill ${STATUS_PILL[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                  {order.sessionStatus ? ` · ${order.sessionStatus.toLowerCase().replaceAll("_", " ")}` : ""}
                </div>
              </div>
              <div className="notification-panel__actions">
                {cancellable && (
                  <>
                    <Link href={`/checkout/matching?order=${order.orderNo}`} className="btn btn--sm btn--ghost">
                      View
                    </Link>
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => cancelOrder(order.id)}>
                      Cancel
                    </button>
                  </>
                )}
                {(order.status === "assigned" || order.status === "in_progress") && (
                  <Link href={`/checkout/matching?order=${order.orderNo}`} className="btn btn--sm btn--ghost">
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
