"use client";

import Link from "next/link";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { BookingsTable } from "@/components/dashboard/client/BookingsTable";
import { displayStatus } from "@/lib/dashboard/orderDisplay";

// Stats + "upcoming sessions" preview, computed from the real order history
// this browser has generated (see useAllOrders) instead of a static mock.
export function ClientOverviewPanels() {
  const orders = useAllOrders();

  const spend = orders
    .filter((o) => displayStatus(o.status) !== "cancelled")
    .reduce((sum, o) => sum + o.priceEUR, 0);
  const upcoming = orders.filter((o) => displayStatus(o.status) === "upcoming");
  const completedCount = orders.filter((o) => displayStatus(o.status) === "completed").length;

  const gameCounts = new Map<string, number>();
  orders.forEach((o) => gameCounts.set(o.gameName, (gameCounts.get(o.gameName) ?? 0) + 1));
  let favoriteGame = "—";
  let topCount = 0;
  gameCounts.forEach((count, name) => {
    if (count > topCount) {
      topCount = count;
      favoriteGame = name;
    }
  });

  const upcomingPreview = upcoming.slice(0, 3);

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-sack-dollar" label="Total spend" value={spend} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-calendar-check" label="Upcoming bookings" value={upcoming.length} color="var(--accent)" />
        <StatCard icon="fa-solid fa-flag-checkered" label="Completed sessions" value={completedCount} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-gamepad" label="Favorite game" value={favoriteGame} color="var(--hue-purple)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Upcoming sessions</div>
            <div className="dashboard-panel__sub">
              {upcomingPreview.length > 0 ? `Your next ${upcomingPreview.length} booking${upcomingPreview.length > 1 ? "s" : ""}` : "Nothing booked right now"}
            </div>
          </div>
          <Link href="/dashboard/client/orders" className="btn btn--ghost btn--sm">
            View all
          </Link>
        </div>
        {upcomingPreview.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
            <p>No upcoming sessions.</p>
            <Link href="/games" className="btn btn--vivid btn--sm">
              Book a teammate
            </Link>
          </div>
        ) : (
          <BookingsTable orders={upcomingPreview} />
        )}
      </div>
    </>
  );
}
