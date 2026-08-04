import type { Metadata } from "next";
import { getUsersWithTeammate } from "@/lib/admin/users";
import { AdminUsersTable, type AdminUserRow } from "@/components/dashboard/admin/AdminUsersTable";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";

export const metadata: Metadata = { title: "Users" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getUsersWithTeammate();
  const rows: AdminUserRow[] = users.map((u) => ({
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

  // Real counts straight off the roster — the overview's other tiles come
  // from this browser's order history, these don't.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const stats = {
    total: users.length,
    clients: users.filter((u) => u.role === "CLIENT").length,
    teammates: users.filter((u) => u.role === "TEAMMATE").length,
    newThisMonth: users.filter((u) => u.createdAt >= monthStart).length,
  };

  return (
    <>
    <LiveRefresh />
    <StatGrid>
      <StatCard icon="fa-solid fa-users" label="Total accounts" value={stats.total} color="var(--accent)" />
      <StatCard icon="fa-solid fa-user" label="Clients" value={stats.clients} color="var(--hue-cyan)" />
      <StatCard icon="fa-solid fa-headset" label="Teammates" value={stats.teammates} color="var(--hue-green)" />
      <StatCard icon="fa-solid fa-user-plus" label="New this month" value={stats.newThisMonth} color="var(--hue-gold)" />
    </StatGrid>

    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Users</div>
          <div className="dashboard-panel__sub">Every real account — promote a client to teammate, or the other way around</div>
        </div>
      </div>
      <AdminUsersTable users={rows} />
    </div>
    </>
  );
}
