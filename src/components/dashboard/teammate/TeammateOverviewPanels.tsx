"use client";

import Link from "next/link";
import { useAllOrdersState } from "@/lib/matchmaking/useAllOrders";
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
}

// Money and rating both come from the server: the teammate's cut must not be
// derivable from /api/dispatch/orders, which the customer side reads too, and
// the rating lives on reviews rather than in this browser's order history.
export function TeammateOverviewPanels({ balanceEUR, pendingEUR }: Props) {
  const teammateId = useCurrentTeammateId();
  const { orders: allOrders, loading } = useAllOrdersState();

  const upcoming = allOrders
    .filter((o) => o.selectedTeammateIds.includes(teammateId ?? ""))
    .filter((o) => o.status === "assigned" || o.status === "in_progress")
    .slice(0, 3);

  // Orders inviting this teammate that they haven't answered yet. The full
  // list, with the accept buttons, lives on /dashboard/teammate/requests —
  // this is only the count that gets someone to go there.
  const openRequests = allOrders.filter(
    (order) =>
      ["searching", "candidates_ready", "selecting"].includes(order.status) &&
      order.candidates.some((c) => c.teammateId === teammateId && c.status === "pending"),
  ).length;

  return (
    <>
      {/* Three tiles, not five. Rating and session count are already on the
          sidebar profile two inches to the left, and lifetime earned belongs
          on Payments with the ledger that explains it — repeating them here
          made the page long without answering anything new. What is left is
          what a teammate opens this page to check: what they can withdraw,
          what is still coming, and whether there is work waiting. */}
      <StatGrid>
        <StatCard icon="fa-solid fa-wallet" label="Available balance" value={balanceEUR} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={pendingEUR} currency color="var(--hue-gold)" />
        <StatCard
          icon="fa-solid fa-inbox"
          label={openRequests === 1 ? "Open request" : "Open requests"}
          value={openRequests}
          color={openRequests > 0 ? "var(--accent)" : "var(--text-faint)"}
          href="/dashboard/teammate/requests"
        />
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
