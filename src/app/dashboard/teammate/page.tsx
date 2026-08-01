import type { Metadata } from "next";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import { ReviewsList } from "@/components/dashboard/teammate/ReviewsList";
import { AvailabilityToggle } from "@/components/dashboard/teammate/AvailabilityToggle";
import { TEAMMATE_STATS, UPCOMING_SESSIONS, RECENT_REVIEWS } from "@/lib/dashboard/teammateData";

export const metadata: Metadata = { title: "Teammate Dashboard" };

export default function TeammateDashboardPage() {
  return (
    <>
      <div id="overview">
        <StatGrid>
          <StatCard icon="fa-solid fa-sack-dollar" label="Total earnings" value={TEAMMATE_STATS.totalEarningsEUR} currency color="var(--hue-green)" />
          <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={TEAMMATE_STATS.pendingPayoutEUR} currency color="var(--hue-gold)" />
          <StatCard icon="fa-solid fa-star" label="Average rating" value={TEAMMATE_STATS.avgRating.toFixed(1)} color="var(--hue-gold)" />
          <StatCard icon="fa-solid fa-flag-checkered" label="Sessions completed" value={TEAMMATE_STATS.sessionsCompleted} color="var(--accent)" />
        </StatGrid>

        <AvailabilityToggle />
      </div>

      <div className="dashboard-panel" id="sessions">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Upcoming sessions</div>
            <div className="dashboard-panel__sub">Your next booked sessions</div>
          </div>
        </div>
        <SessionsList sessions={UPCOMING_SESSIONS} />
      </div>

      <div className="dashboard-panel" id="reviews">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Recent reviews</div>
            <div className="dashboard-panel__sub">What clients are saying</div>
          </div>
        </div>
        <ReviewsList reviews={RECENT_REVIEWS} />
      </div>
    </>
  );
}
