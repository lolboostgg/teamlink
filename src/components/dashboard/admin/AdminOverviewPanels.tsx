"use client";

import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { computeAdminStats } from "@/lib/dashboard/adminMetrics";

// Real stats derived from every dispatch order that's ever hit this
// browser's localStorage — see lib/dashboard/adminMetrics.ts. Scoped to
// this browser, not a platform-wide figure, since there's no server.
export function AdminOverviewPanels() {
  const stats = computeAdminStats(useAllOrders());

  return (
    <StatGrid>
      <StatCard icon="fa-solid fa-sack-dollar" label="Gross merchandise value" value={stats.gmvEUR} currency color="var(--hue-green)" />
      <StatCard icon="fa-solid fa-bolt" label="Active bookings" value={stats.activeBookings} color="var(--accent)" />
      <StatCard icon="fa-solid fa-receipt" label="Total orders" value={stats.totalOrders} color="var(--hue-cyan)" />
      <StatCard icon="fa-solid fa-flag-checkered" label="Completed sessions" value={stats.completedSessions} color="var(--hue-gold)" />
    </StatGrid>
  );
}
