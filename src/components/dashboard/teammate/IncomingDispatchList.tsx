"use client";

import { PriceTag } from "@/components/currency/PriceTag";
import { CURRENT_TEAMMATE_ID, DISPATCH_WINDOW_MS } from "@/lib/matchmaking/store";
import { useIncomingDispatches } from "@/lib/matchmaking/useIncomingDispatches";
import type { DispatchOrder } from "@/lib/matchmaking/types";

function secondsLeft(order: DispatchOrder): number {
  return Math.max(0, Math.ceil((order.dispatchDeadline - Date.now()) / 1000));
}

// Real, order-accurate invites for the fixed demo teammate identity (Nova)
// — see CURRENT_TEAMMATE_ID in lib/matchmaking/store.ts. Distinct from the
// ambient NotificationPanel (random flavor notifications, unrelated orders).
export function IncomingDispatchList() {
  const { pendingInvites, respond } = useIncomingDispatches();

  if (pendingInvites.length === 0) {
    return (
      <div className="notification-panel">
        <div className="notification-panel__empty">
          <i className="fa-solid fa-bell-slash" aria-hidden="true" />
          No live match requests right now — book a session as a customer to see one arrive here.
        </div>
      </div>
    );
  }

  return (
    <div className="notification-panel">
      {pendingInvites.map((order) => {
        const candidate = order.candidates.find((c) => c.teammateId === CURRENT_TEAMMATE_ID);
        if (!candidate) return null;
        const pct = Math.round((secondsLeft(order) / (DISPATCH_WINDOW_MS / 1000)) * 100);
        return (
          <div className="notification-panel__item" key={order.id}>
            <div className="notification-panel__icon">
              <i className="fa-solid fa-bolt" aria-hidden="true" />
            </div>
            <div className="notification-panel__body">
              <div className="notification-panel__title">
                {order.customerLabel} wants to book {order.gameName}
              </div>
              <div className="notification-panel__meta">
                {order.option} · <PriceTag amountEUR={order.priceEUR} /> · {secondsLeft(order)}s to respond
              </div>
              <div className="dispatch-invite__bar">
                <span className="dispatch-invite__bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="notification-panel__actions">
                <button type="button" className="btn btn--sm btn--vivid" onClick={() => respond(order.id, true)}>
                  Accept
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => respond(order.id, false)}>
                  Decline
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
