"use client";

import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { useReviews } from "@/lib/reviews";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import type { DispatchOrder } from "@/lib/matchmaking/types";

// Earnings are split evenly across an order's requested group size — the
// simplest honest stand-in for "everyone on a multi-teammate order gets
// paid their share" until a real payout system exists.
function shareOf(order: DispatchOrder): number {
  return order.priceEUR / Math.max(1, order.teammates);
}

// Stats + upcoming sessions computed from the real dispatch store, scoped
// to whichever real teammate is signed in — not a static mock.
export function TeammateOverviewPanels() {
  const teammateId = useCurrentTeammateId();
  const orders = useAllOrders().filter((o) => o.selectedTeammateIds.includes(teammateId ?? ""));
  const reviews = useReviews().filter((r) => r.teammateId === teammateId);

  const completed = orders.filter((o) => o.status === "completed");
  const pending = orders.filter((o) => o.status === "assigned" || o.status === "in_progress");
  const upcoming = pending.slice(0, 3);

  const totalEarnings = completed.reduce((sum, o) => sum + shareOf(o), 0);
  const pendingPayout = pending.reduce((sum, o) => sum + shareOf(o), 0);
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-sack-dollar" label="Total earnings" value={totalEarnings} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={pendingPayout} currency color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-star" label="Average rating" value={avgRating !== null ? avgRating.toFixed(1) : "—"} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-flag-checkered" label="Sessions completed" value={completed.length} color="var(--accent)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Upcoming sessions</div>
            <div className="dashboard-panel__sub">
              {upcoming.length > 0 ? "Your next booked sessions" : "Nothing booked right now"}
            </div>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
            <p>No upcoming sessions yet.</p>
          </div>
        ) : (
          <SessionsList orders={upcoming} />
        )}
      </div>
    </>
  );
}
