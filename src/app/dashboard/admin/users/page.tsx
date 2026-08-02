import type { Metadata } from "next";
import { getUsersWithTeammate } from "@/lib/admin/users";
import { AdminUsersTable, type AdminUserRow } from "@/components/dashboard/admin/AdminUsersTable";

export const metadata: Metadata = { title: "Users" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getUsersWithTeammate();
  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.getTime(),
    teammateName: u.teammate?.name ?? null,
  }));

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Users</div>
          <div className="dashboard-panel__sub">Every real account — promote a client to teammate, or the other way around</div>
        </div>
      </div>
      <AdminUsersTable users={rows} />
    </div>
  );
}
