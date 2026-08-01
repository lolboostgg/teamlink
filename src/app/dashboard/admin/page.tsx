import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { SignupsTable } from "@/components/dashboard/admin/SignupsTable";
import { ADMIN_STATS, RECENT_SIGNUPS } from "@/lib/dashboard/adminData";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default function AdminDashboardPage() {
  return (
    <>
      <WelcomeBanner
        name="Welcome back, Admin"
        message="Platform health at a glance."
        links={[
          { href: "/dashboard/admin/signups", label: "Signups", icon: "fa-solid fa-users" },
          { href: "/dashboard/admin/payouts", label: "Payouts & disputes", icon: "fa-solid fa-sack-dollar" },
        ]}
      />

      <StatGrid>
        <StatCard icon="fa-solid fa-sack-dollar" label="Gross merchandise value" value={ADMIN_STATS.gmvEUR} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-bolt" label="Active bookings" value={ADMIN_STATS.activeBookings} color="var(--accent)" />
        <StatCard icon="fa-solid fa-users" label="Total users" value={ADMIN_STATS.totalUsers.toLocaleString("en-US")} color="var(--hue-cyan)" />
        <StatCard icon="fa-solid fa-user-clock" label="Pending approvals" value={ADMIN_STATS.pendingApprovals} color="var(--hue-gold)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Recent signups</div>
            <div className="dashboard-panel__sub">New clients and teammates in the last 72 hours</div>
          </div>
        </div>
        <SignupsTable signups={RECENT_SIGNUPS} />
      </div>
    </>
  );
}
