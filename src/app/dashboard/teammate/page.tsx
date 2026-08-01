import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { AvailabilityToggle } from "@/components/dashboard/teammate/AvailabilityToggle";
import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import { TEAMMATE_STATS, UPCOMING_SESSIONS } from "@/lib/dashboard/teammateData";

export const metadata: Metadata = { title: "Teammate Dashboard" };

export default function TeammateDashboardPage() {
  return (
    <>
      <WelcomeBanner
        name="Welcome back, Nova"
        message="Stay online to keep receiving booking requests."
        links={[
          { href: "/dashboard/teammate/sessions", label: "Sessions", icon: "fa-solid fa-calendar-check" },
          { href: "/dashboard/teammate/chat", label: "Chat", icon: "fa-solid fa-comments" },
        ]}
      />

      <StatGrid>
        <StatCard icon="fa-solid fa-sack-dollar" label="Total earnings" value={TEAMMATE_STATS.totalEarningsEUR} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={TEAMMATE_STATS.pendingPayoutEUR} currency color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-star" label="Average rating" value={TEAMMATE_STATS.avgRating.toFixed(1)} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-flag-checkered" label="Sessions completed" value={TEAMMATE_STATS.sessionsCompleted} color="var(--accent)" />
      </StatGrid>

      <AvailabilityToggle />

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Upcoming sessions</div>
            <div className="dashboard-panel__sub">Your next booked sessions</div>
          </div>
        </div>
        <SessionsList sessions={UPCOMING_SESSIONS} />
      </div>
    </>
  );
}
