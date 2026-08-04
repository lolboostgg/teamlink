import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { AdminOverviewPanels } from "@/components/dashboard/admin/AdminOverviewPanels";
import { AdminUsersTable, type AdminUserRow } from "@/components/dashboard/admin/AdminUsersTable";
import { getRecentUsers } from "@/lib/admin/users";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin Dashboard" };
// This page queries the live DB — force dynamic rendering instead of
// letting Next.js probe it during `next build`'s page-data-collection
// pass, where a real (even if transient) DB failure would fail the whole
// build instead of just that one request at actual runtime.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // One grouped query instead of pulling every order row into memory just to
  // reduce four numbers out of it.
  const [session, users, byStatus] = await Promise.all([
    auth(),
    getRecentUsers(5),
    prisma.order.groupBy({ by: ["status"], _sum: { priceEUR: true }, _count: { _all: true } }),
  ]);

  const failed = new Set(["CANCELLED", "NO_MATCH"]);
  const terminal = new Set(["COMPLETED", "CANCELLED", "NO_MATCH"]);
  const sumWhere = (predicate: (status: string) => boolean) =>
    byStatus.filter((row) => predicate(row.status)).reduce((sum, row) => sum + Number(row._sum.priceEUR ?? 0), 0);
  const countWhere = (predicate: (status: string) => boolean) =>
    byStatus.filter((row) => predicate(row.status)).reduce((sum, row) => sum + row._count._all, 0);

  const stats = {
    gmvEUR: sumWhere((status) => !failed.has(status)),
    activeBookings: countWhere((status) => !terminal.has(status)),
    totalOrders: countWhere(() => true),
    completedSessions: countWhere((status) => status === "COMPLETED"),
  };
  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "Admin";
  const recentRows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    accountNo: u.accountNo,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
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
