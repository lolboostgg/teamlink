import type { Metadata } from "next";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { BookingsTable } from "@/components/dashboard/client/BookingsTable";
import { FavoritesList } from "@/components/dashboard/client/FavoritesList";
import { CLIENT_STATS, CLIENT_BOOKINGS, CLIENT_FAVORITES } from "@/lib/dashboard/clientData";

export const metadata: Metadata = { title: "Client Dashboard" };

export default function ClientDashboardPage() {
  return (
    <>
      <div id="overview">
        <StatGrid>
          <StatCard icon="fa-solid fa-sack-dollar" label="Total spend" value={CLIENT_STATS.totalSpendEUR} currency color="var(--hue-green)" />
          <StatCard icon="fa-solid fa-calendar-check" label="Upcoming bookings" value={CLIENT_STATS.upcomingCount} color="var(--accent)" />
          <StatCard icon="fa-solid fa-flag-checkered" label="Completed sessions" value={CLIENT_STATS.completedCount} color="var(--hue-gold)" />
          <StatCard icon="fa-solid fa-gamepad" label="Favorite game" value={CLIENT_STATS.favoriteGame} color="var(--hue-purple)" />
        </StatGrid>
      </div>

      <div className="dashboard-panel" id="bookings">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Your bookings</div>
            <div className="dashboard-panel__sub">Upcoming, completed, and cancelled sessions</div>
          </div>
        </div>
        <BookingsTable bookings={CLIENT_BOOKINGS} />
      </div>

      <div className="dashboard-panel" id="favorites">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Favorite teammates</div>
            <div className="dashboard-panel__sub">Players you&rsquo;ve booked with more than once</div>
          </div>
        </div>
        <FavoritesList favorites={CLIENT_FAVORITES} />
      </div>
    </>
  );
}
