import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { setAdminRole } from "./actions";

export const metadata: Metadata = { title: "Admin roles" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireAdmin("security");
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, accountNo: true, name: true, email: true, adminRole: true, lastSeenAt: true }, orderBy: { name: "asc" } });
  return <section className="dashboard-panel admin-ops-page"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Admin roles</div><div className="dashboard-panel__sub">Role changes require your current password</div></div></div>
    <div className="admin-ticket-list">{admins.map(admin => <article className="admin-ticket" key={admin.id}><header><div><h3>{admin.name || admin.email} · #{admin.accountNo}</h3></div><small>{admin.lastSeenAt ? `Seen ${admin.lastSeenAt.toLocaleString("en-GB")}` : "Never seen"}</small></header><form action={setAdminRole} className="admin-ticket__form"><input type="hidden" name="userId" value={admin.id}/><select name="adminRole" defaultValue={admin.adminRole ?? "SUPERADMIN"}>{["SUPPORT","OPERATIONS","FINANCE","SUPERADMIN"].map(role => <option key={role}>{role}</option>)}</select><input name="password" type="password" required placeholder="Your password"/><button className="btn btn--vivid btn--sm">Change role</button></form></article>)}</div>
  </section>;
}
