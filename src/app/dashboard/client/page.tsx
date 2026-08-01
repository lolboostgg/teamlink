import type { Metadata } from "next";
import Link from "next/link";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { BookingsTable } from "@/components/dashboard/client/BookingsTable";
import { CLIENT_STATS, CLIENT_BOOKINGS } from "@/lib/dashboard/clientData";

export const metadata: Metadata = { title: "Client Dashboard" };

export default function ClientDashboardPage() {
  const upcoming = CLIENT_BOOKINGS.filter((b) => b.status === "upcoming").slice(0, 3);

  return (
    <>
      <WelcomeBanner
        name="Welcome back, Alex"
        message="Here's what's happening with your bookings today."
        links={[
          { href: "/games", label: "Book a teammate", icon: "fa-solid fa-bolt" },
          { href: "/dashboard/client/orders", label: "View orders", icon: "fa-solid fa-calendar-check" },
          { href: "/dashboard/client/chat", label: "Chat", icon: "fa-solid fa-comments" },
        ]}
      />

      <StatGrid>
        <StatCard icon="fa-solid fa-sack-dollar" label="Total spend" value={CLIENT_STATS.totalSpendEUR} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-calendar-check" label="Upcoming bookings" value={CLIENT_STATS.upcomingCount} color="var(--accent)" />
        <StatCard icon="fa-solid fa-flag-checkered" label="Completed sessions" value={CLIENT_STATS.completedCount} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-gamepad" label="Favorite game" value={CLIENT_STATS.favoriteGame} color="var(--hue-purple)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Upcoming sessions</div>
            <div className="dashboard-panel__sub">Your next 3 bookings</div>
          </div>
          <Link href="/dashboard/client/orders" className="btn btn--ghost btn--sm">
            View all
          </Link>
        </div>
        <BookingsTable bookings={upcoming} />
      </div>
    </>
  );
}
