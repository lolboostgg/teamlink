"use client";

import Link from "next/link";
import { useAllOrdersState } from "@/lib/matchmaking/useAllOrders";
import { useReviews } from "@/lib/reviews";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import { PriceTag } from "@/components/currency/PriceTag";

interface Props {
  /** Booked earnings from the ledger — no longer an estimate. */
  balanceEUR: number;
  /** What the currently assigned orders will add once they complete. */
  pendingEUR: number;
  sessionsCount: number;
}

// Both money figures come from the server: the teammate's cut must not be
// derivable from /api/dispatch/orders, which the customer side reads too.
export function TeammateOverviewPanels({ balanceEUR, pendingEUR, sessionsCount }: Props) {
  const teammateId = useCurrentTeammateId();
  const { orders: allOrders, loading } = useAllOrdersState();
  const reviews = useReviews().filter((r) => r.teammateId === teammateId);

  const upcoming = allOrders
    .filter((o) => o.selectedTeammateIds.includes(teammateId ?? ""))
    .filter((o) => o.status === "assigned" || o.status === "in_progress")
    .slice(0, 3);

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-wallet" label="Available balance" value={balanceEUR} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={pendingEUR} currency color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-star" label="Average rating" value={avgRating !== null ? avgRating.toFixed(1) : "—"} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-flag-checkered" label="Sessions completed" value={sessionsCount} color="var(--accent)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Upcoming sessions</div>
            <div className="dashboard-panel__sub">
              {loading ? "Loading your sessions…" : upcoming.length > 0 ? "Your next booked sessions" : "Nothing booked right now"}
            </div>
          </div>
          {pendingEUR > 0 && (
            <span className="dashboard-pill dashboard-pill--muted">
              <i className="fa-solid fa-hourglass-half" aria-hidden="true" /> <PriceTag amountEUR={pendingEUR} /> on completion
            </span>
          )}
        </div>
        {loading ? (
          <div className="dashboard-empty dashboard-empty--compact">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            <p>Loading&hellip;</p>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
            <p>No upcoming sessions yet.</p>
            <Link href="/dashboard/teammate/sessions" className="btn btn--ghost btn--sm">
              View all orders
            </Link>
          </div>
        ) : (
          <SessionsList orders={upcoming} />
        )}
      </div>
    </>
  );
}
