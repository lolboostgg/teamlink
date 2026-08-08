"use client";

import { useState } from "react";
import { useAllOrdersState } from "@/lib/matchmaking/useAllOrders";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { respondToDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { PriceTag } from "@/components/currency/PriceTag";
import { gameIcon } from "@/lib/gameArt";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Every open request at once.
 *
 * The dispatch modal shows one order and blocks the screen, which is right
 * when there is one — it is an interruption that wants an answer. It is wrong
 * when three land together: the others queue up invisibly behind it and the
 * teammate can't tell whether they are choosing between a €4.99 Duo and a
 * €12 Flex, or answering the only thing on offer. This is the list view of
 * the same queue, and both stay in sync because both read the same orders.
 */
export function OpenRequestsList() {
  const teammateId = useCurrentTeammateId();
  const { orders, loading, refresh } = useAllOrdersState();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const open = orders
    .filter((order) => ["searching", "candidates_ready", "selecting"].includes(order.status))
    .map((order) => ({
      order,
      candidate: order.candidates.find((c) => c.teammateId === teammateId),
    }))
    .filter((row) => row.candidate?.status === "pending")
    // Oldest first: the one closest to expiring is the one to answer first.
    .sort((a, b) => (a.order.dispatchDeadline ?? 0) - (b.order.dispatchDeadline ?? 0));

  async function respond(orderId: string, accept: boolean) {
    setBusyId(orderId);
    const result = await respondToDispatchAction(orderId, accept);
    setBusyId(null);
    if (!result.ok) showToast(result.error, "error");
    else if (accept) showToast("Accepted — waiting for the customer to pick.", "success");
    refresh();
  }

  if (loading) {
    return (
      <div className="dashboard-empty dashboard-empty--compact">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <p>Loading requests&hellip;</p>
      </div>
    );
  }

  if (open.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-inbox" aria-hidden="true" />
        <p>No open requests right now.</p>
        <span className="dashboard-empty__hint">
          Stay online and listed for the games you play — requests show up here the moment they are dispatched.
        </span>
      </div>
    );
  }

  return (
    <div className="request-list">
      {open.map(({ order }) => (
        <div key={order.id} className="request-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gameIcon(order.gameSlug)} alt="" className="request-card__icon" />

          <div className="request-card__main">
            <div className="request-card__title">
              {order.gameName} · {order.option}
            </div>
            <div className="request-card__meta">
              <span>#{order.orderNo}</span>
              <span>
                {order.teammates === 1 ? "1 teammate" : `${order.teammates} teammates`}
              </span>
              <span>{order.gamesBooked === 1 ? "1 game" : `${order.gamesBooked} games`}</span>
              {order.vibe && <span className="request-card__tag">{order.vibe}</span>}
            </div>
          </div>

          <div className="request-card__pay">
            <PriceTag amountEUR={order.priceEUR} />
            <span>customer pays</span>
          </div>

          <div className="request-card__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busyId === order.id}
              onClick={() => respond(order.id, false)}
            >
              Decline
            </button>
            <button
              type="button"
              className="btn btn--vivid btn--sm"
              disabled={busyId === order.id}
              onClick={() => respond(order.id, true)}
            >
              {busyId === order.id ? "…" : "Accept"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
