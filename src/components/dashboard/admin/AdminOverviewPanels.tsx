import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";

interface Props {
  stats: { gmvEUR: number; activeBookings: number; totalOrders: number; completedSessions: number };
}

export function AdminOverviewPanels({ stats }: Props) {
  return (
    <StatGrid>
      <StatCard icon="fa-solid fa-sack-dollar" label="Gross merchandise value" value={stats.gmvEUR} currency color="var(--hue-green)" />
      <StatCard icon="fa-solid fa-bolt" label="Active bookings" value={stats.activeBookings} color="var(--accent)" />
      <StatCard icon="fa-solid fa-receipt" label="Total orders" value={stats.totalOrders} color="var(--hue-cyan)" />
      <StatCard icon="fa-solid fa-flag-checkered" label="Completed sessions" value={stats.completedSessions} color="var(--hue-gold)" />
    </StatGrid>
  );
}
