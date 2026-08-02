import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { SignupsTable } from "@/components/dashboard/admin/SignupsTable";
import { AdminOverviewPanels } from "@/components/dashboard/admin/AdminOverviewPanels";

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

      <AdminOverviewPanels />

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Recent signups</div>
            <div className="dashboard-panel__sub">New clients and teammates</div>
          </div>
        </div>
        <SignupsTable />
      </div>
    </>
  );
}
