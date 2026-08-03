import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { AdminOverviewPanels } from "@/components/dashboard/admin/AdminOverviewPanels";
import { AdminUsersTable, type AdminUserRow } from "@/components/dashboard/admin/AdminUsersTable";
import { getUsersWithTeammate } from "@/lib/admin/users";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin Dashboard" };
// This page queries the live DB — force dynamic rendering instead of
// letting Next.js probe it during `next build`'s page-data-collection
// pass, where a real (even if transient) DB failure would fail the whole
// build instead of just that one request at actual runtime.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [session, users, orders] = await Promise.all([
    auth(),
    getUsersWithTeammate(),
    prisma.order.findMany({ select: { priceEUR: true, status: true } }),
  ]);
  const failed = new Set(["CANCELLED", "NO_MATCH"]);
  const terminal = new Set(["COMPLETED", "CANCELLED", "NO_MATCH"]);
  const stats = {
    gmvEUR: orders.filter((order) => !failed.has(order.status)).reduce((sum, order) => sum + Number(order.priceEUR), 0),
    activeBookings: orders.filter((order) => !terminal.has(order.status)).length,
    totalOrders: orders.length,
    completedSessions: orders.filter((order) => order.status === "COMPLETED").length,
  };
  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "Admin";
  const recentRows: AdminUserRow[] = users.slice(0, 5).map((u) => ({
    id: u.id,
    accountNo: u.accountNo,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.getTime(),
    teammateName: u.teammate?.name ?? null,
    discordId: u.discordId,
    discordUsername: u.discordUsername,
    discordAvatar: u.discordAvatar,
  }));

  return (
    <>
      <WelcomeBanner
        name={displayName}
        message="Platform health at a glance."
        links={[
          { href: "/dashboard/admin/users", label: "Users", icon: "fa-solid fa-users" },
          { href: "/dashboard/admin/payouts", label: "Payouts & disputes", icon: "fa-solid fa-sack-dollar" },
        ]}
      />

      <AdminOverviewPanels stats={stats} />

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Recent users</div>
            <div className="dashboard-panel__sub">Newest accounts — clients and teammates</div>
          </div>
          <Link href="/dashboard/admin/users" className="btn btn--ghost btn--sm">
            View all
          </Link>
        </div>
        <AdminUsersTable users={recentRows} />
      </div>
    </>
  );
}
