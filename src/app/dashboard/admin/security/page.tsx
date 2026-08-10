import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { revokeAdminSession } from "./actions";

export const metadata: Metadata = { title: "Admin security" };
export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  await requireAdmin("security");
  const [sessions, events, admins] = await Promise.all([prisma.adminSession.findMany({ orderBy: { lastSeenAt: "desc" }, take: 100 }), prisma.loginEvent.findMany({ orderBy: { createdAt: "desc" }, take: 150 }), prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true } })]);
  const names = new Map(admins.map(a => [a.id, a.name || a.email]));
  return <div className="admin-ops-page"><section className="dashboard-panel"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Active admin sessions</div><div className="dashboard-panel__sub">Revoke a device immediately</div></div></div><div className="admin-ops-table-wrap"><table className="admin-ops-table"><thead><tr><th>Admin</th><th>Device</th><th>IP</th><th>Last seen</th><th>Expires</th><th></th></tr></thead><tbody>{sessions.map(s => <tr key={s.id}><td>{names.get(s.userId) ?? "Unknown admin"}</td><td>{s.userAgent || "Unknown"}</td><td>{s.ipAddress || "—"}</td><td>{s.lastSeenAt.toLocaleString("en-GB")}</td><td>{s.expiresAt.toLocaleString("en-GB")}</td><td>{!s.revokedAt ? <form action={revokeAdminSession}><input type="hidden" name="id" value={s.id}/><button className="btn btn--danger btn--sm">Sign out</button></form> : <span className="status-badge">Revoked</span>}</td></tr>)}</tbody></table></div></section>
    <section className="dashboard-panel"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Login history</div><div className="dashboard-panel__sub">Successful, failed and unusual sign-ins</div></div></div><div className="admin-ops-table-wrap"><table className="admin-ops-table"><thead><tr><th>Time</th><th>Account</th><th>Result</th><th>IP</th><th>Device</th><th>Signal</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{e.createdAt.toLocaleString("en-GB")}</td><td>{e.userId ? names.get(e.userId) ?? e.email : e.email}</td><td><span className={`status-badge ${e.successful ? "status-active" : "status-banned"}`}>{e.successful ? "Success" : "Failed"}</span></td><td>{e.ipAddress || "—"}</td><td>{e.userAgent || "—"}</td><td>{e.suspicious ? "New IP" : e.reason || "Normal"}</td></tr>)}</tbody></table></div></section></div>;
}
