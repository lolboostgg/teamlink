import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";

export const metadata: Metadata = { title: "Admin activity" };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin("security");
  const logs = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const actorIds = [...new Set(logs.flatMap((log) => log.actorId ? [log.actorId] : []))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } });
  const names = new Map(actors.map((actor) => [actor.id, actor.name || actor.email]));

  return <section className="dashboard-panel admin-ops-page">
    <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Admin activity</div><div className="dashboard-panel__sub">Immutable history of sensitive changes · latest 200 entries</div></div></div>
    <div className="admin-ops-table-wrap"><table className="admin-ops-table"><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Reason</th><th>Change</th></tr></thead><tbody>
      {logs.map((log) => <tr key={log.id}><td>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}</td><td>{log.actorId ? names.get(log.actorId) ?? "Deleted admin" : "System"}</td><td><span className="status-badge">{log.action.replaceAll(".", " ")}</span></td><td>{log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</td><td>{log.reason || "—"}</td><td><details><summary>View</summary><pre>{JSON.stringify({ before: log.before, after: log.after }, null, 2)}</pre></details></td></tr>)}
      {!logs.length && <tr><td colSpan={6}>No admin activity recorded yet.</td></tr>}
    </tbody></table></div>
  </section>;
}
