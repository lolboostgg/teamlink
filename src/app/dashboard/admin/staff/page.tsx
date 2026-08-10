import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { AdminRoleForm } from "@/components/dashboard/admin/AdminRoleForm";

export const metadata: Metadata = { title: "Admin roles" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { user } = await requireAdmin("security");
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, accountNo: true, name: true, email: true, adminRole: true, lastSeenAt: true }, orderBy: { name: "asc" } });
  return <section className="dashboard-panel admin-ops-page"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Admin roles</div><div className="dashboard-panel__sub">Only superadmins can view this page and assign roles to other admins.</div></div></div>
    <div className="admin-ticket-list">{admins.map(admin => <article className="admin-ticket" key={admin.id}><header><div><h3>{admin.name || admin.email} · #{admin.accountNo}</h3></div><small>{admin.id === user.id ? "Your account" : admin.lastSeenAt ? `Seen ${admin.lastSeenAt.toLocaleString("en-GB")}` : "Never seen"}</small></header><AdminRoleForm userId={admin.id} initialRole={admin.adminRole ?? "SUPERADMIN"} disabled={admin.id === user.id}/></article>)}</div>
  </section>;
}
