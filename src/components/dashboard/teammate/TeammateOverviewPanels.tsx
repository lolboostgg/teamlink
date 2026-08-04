"use client";

import Link from "next/link";
import { useAllOrdersState } from "@/lib/matchmaking/useAllOrders";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import { ReviewsList, type DisplayReview } from "@/components/dashboard/teammate/ReviewsList";
import { PriceTag } from "@/components/currency/PriceTag";

interface Props {
  /** Booked earnings from the ledger — no longer an estimate. */
  balanceEUR: number;
  /** What the currently assigned orders will add once they complete. */
  pendingEUR: number;
  /** Everything ever credited, before any payout was deducted. */
  earnedEUR: number;
  sessionsCount: number;
  /** Null until the first review lands. */
  ratingAverage: number | null;
  reviewCount: number;
  reviews: DisplayReview[];
}

// Money and rating both come from the server: the teammate's cut must not be
// derivable from /api/dispatch/orders, which the customer side reads too, and
// the rating lives on reviews rather than in this browser's order history.
export function TeammateOverviewPanels({
  balanceEUR,
  pendingEUR,
  earnedEUR,
  sessionsCount,
  ratingAverage,
  reviewCount,
  reviews,
}: Props) {
  const teammateId = useCurrentTeammateId();
  const { orders: allOrders, loading } = useAllOrdersState();

  const upcoming = allOrders
    .filter((o) => o.selectedTeammateIds.includes(teammateId ?? ""))
    .filter((o) => o.status === "assigned" || o.status === "in_progress")
    .slice(0, 3);

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-wallet" label="Available balance" value={balanceEUR} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={pendingEUR} currency color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-sack-dollar" label="Lifetime earned" value={earnedEUR} currency color="var(--hue-purple)" />
        <StatCard
          icon="fa-solid fa-star"
          label={reviewCount > 0 ? `Average rating · ${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "Average rating"}
          value={ratingAverage !== null ? ratingAverage.toFixed(1) : "—"}
          color="var(--hue-gold)"
        />
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

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Reviews you&rsquo;ve received</div>
            <div className="dashboard-panel__sub">
              {reviewCount > 0
                ? `${reviewCount} review${reviewCount === 1 ? "" : "s"} from clients you've played with`
                : "Clients can leave a review after a completed session"}
            </div>
          </div>
          {reviewCount > reviews.length && (
            <Link href="/dashboard/teammate/reviews" className="btn btn--ghost btn--sm">
              View all
            </Link>
          )}
        </div>
        {reviews.length > 0 ? (
          <ReviewsList reviews={reviews} />
        ) : (
          <div className="dashboard-empty dashboard-empty--compact">
            <i className="fa-solid fa-star-half-stroke" aria-hidden="true" />
            <p>No reviews yet.</p>
          </div>
        )}
      </div>
    </>
  );
}
