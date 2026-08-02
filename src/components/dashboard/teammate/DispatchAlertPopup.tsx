"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { PriceTag } from "@/components/currency/PriceTag";
import { useIncomingDispatches } from "@/lib/matchmaking/useIncomingDispatches";
import { playNotificationSound } from "@/lib/notificationSound";

// Global popup + sound alert for whichever real teammate is signed in (see
// useCurrentTeammateId) — fires once per newly-arrived dispatch invite
// regardless of which dashboard page is open, since a real incoming
// request shouldn't require sitting on the Sessions page to notice it.
export function DispatchAlertPopup() {
  const { data: session } = useSession();
  const isTeammate = session?.user?.role === "TEAMMATE";
  const { pendingInvites, respond } = useIncomingDispatches();
  const announced = useRef<Set<string>>(new Set());
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isTeammate) return;
    const fresh = pendingInvites.filter((o) => !announced.current.has(o.id));
    if (fresh.length === 0) return;
    fresh.forEach((o) => announced.current.add(o.id));
    playNotificationSound();
    setVisibleIds((prev) => [...prev, ...fresh.map((o) => o.id)]);
  }, [pendingInvites, isTeammate]);

  if (!isTeammate) return null;

  const visibleOrders = pendingInvites.filter((o) => visibleIds.includes(o.id));
  if (visibleOrders.length === 0) return null;

  return (
    <div className="dispatch-alert-stack">
      {visibleOrders.map((order) => (
        <div className="dispatch-alert" key={order.id}>
          <span className="dispatch-alert__icon">
            <i className="fa-solid fa-bolt" aria-hidden="true" />
          </span>
          <div className="dispatch-alert__body">
            <div className="dispatch-alert__title">New match request</div>
            <div className="dispatch-alert__meta">
              {order.customerLabel} wants {order.gameName} · {order.option} · <PriceTag amountEUR={order.priceEUR} />
            </div>
            <div className="dispatch-alert__actions">
              <button type="button" className="btn btn--sm btn--vivid" onClick={() => respond(order.id, true)}>
                Accept
              </button>
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => respond(order.id, false)}>
                Decline
              </button>
            </div>
          </div>
          <button
            type="button"
            className="dispatch-alert__close"
            aria-label="Dismiss"
            onClick={() => setVisibleIds((prev) => prev.filter((id) => id !== order.id))}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
