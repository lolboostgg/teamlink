"use client";

import Link from "next/link";
import { PriceTag } from "@/components/currency/PriceTag";
import { gameIcon } from "@/lib/gameArt";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";

// The order the teammate is actually on, straight from the server's phase.
// Starting and completing an order happen in the order room now — this card
// is the way in, not a second set of controls.
export function ActiveOrderCard() {
  const { phase, order } = useDispatchState();

  if (!order || (phase !== "SELECTED" && phase !== "ACTIVE_SESSION")) return null;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Active order</div>
          <div className="dashboard-panel__sub">Assigned to you via the live dispatch flow</div>
        </div>
        <span
          className={`dashboard-pill ${
            phase === "ACTIVE_SESSION" ? "dashboard-pill--success" : "dashboard-pill--warning"
          }`}
        >
          {phase === "ACTIVE_SESSION" ? "In progress" : "Ready to start"}
        </span>
      </div>

      <div className="order-room__game">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gameIcon(order.gameSlug)} alt="" />
        <div>
          <strong>
            {order.gameName} · {order.option}
          </strong>
          <span>
            {order.customerLabel} · <PriceTag amountEUR={order.payoutEUR} />
          </span>
        </div>
      </div>

      <div className="teammate-profile-form__actions">
        <Link href={`/dashboard/teammate/session/${order.orderNo}`} className="btn btn--vivid">
          Open order room
        </Link>
      </div>
    </div>
  );
}
