import type { Metadata } from "next";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { SignupsTable } from "@/components/dashboard/admin/SignupsTable";
import { PayoutQueue } from "@/components/dashboard/admin/PayoutQueue";
import { ADMIN_STATS, RECENT_SIGNUPS, SUPPORT_TICKETS, PAYOUT_QUEUE } from "@/lib/dashboard/adminData";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default function AdminDashboardPage() {
  return (
    <>
      <div id="overview">
        <StatGrid>
          <StatCard icon="fa-solid fa-sack-dollar" label="Gross merchandise value" value={ADMIN_STATS.gmvEUR} currency color="var(--hue-green)" />
          <StatCard icon="fa-solid fa-bolt" label="Active bookings" value={ADMIN_STATS.activeBookings} color="var(--accent)" />
          <StatCard icon="fa-solid fa-users" label="Total users" value={ADMIN_STATS.totalUsers.toLocaleString("en-US")} color="var(--hue-cyan)" />
          <StatCard icon="fa-solid fa-user-clock" label="Pending approvals" value={ADMIN_STATS.pendingApprovals} color="var(--hue-gold)" />
        </StatGrid>
      </div>

      <div className="dashboard-panel" id="signups">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Recent signups</div>
            <div className="dashboard-panel__sub">New clients and teammates in the last 72 hours</div>
          </div>
        </div>
        <SignupsTable signups={RECENT_SIGNUPS} />
      </div>

      <div className="dashboard-panel" id="payouts">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Payouts & disputes</div>
            <div className="dashboard-panel__sub">Teammate payout requests waiting on review</div>
          </div>
        </div>
        <PayoutQueue payouts={PAYOUT_QUEUE} tickets={SUPPORT_TICKETS} />
      </div>
    </>
  );
}
