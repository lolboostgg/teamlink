import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export const metadata: Metadata = { title: "Admin activity" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ admin?: string }> };

const ACTION_LABELS: Record<string, string> = {
  admin_role_changed: "Admin role changed",
  user_banned: "User banned",
  user_unbanned: "User unbanned",
  credit_adjusted: "Credit adjusted",
  earnings_adjusted: "Earnings adjusted",
  payout_approved: "Payout approved",
  payout_rejected: "Payout rejected",
  sanction_created: "Sanction created",
  sanction_revoked: "Sanction revoked",
  dispute_updated: "Dispute updated",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replaceAll(".", " ").replaceAll("_", " ").replace(/^./, value => value.toUpperCase());
}

export default async function AuditPage({ searchParams }: Props) {
  await requireAdmin("security");
  const selectedAdmin = (await searchParams).admin || "all";
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true, avatarUrl: true, avatarFocusX: true, avatarFocusY: true, avatarZoom: true },
  });
  const logs = await prisma.adminAuditLog.findMany({
    where: selectedAdmin === "all" ? undefined : selectedAdmin === "system" ? { actorId: null } : { actorId: selectedAdmin },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const actors = new Map(admins.map(admin => [admin.id, admin]));

  return <section className="dashboard-panel admin-ops-page audit-page">
    <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Admin activity</div><div className="dashboard-panel__sub">Immutable history of sensitive changes · latest 200 entries</div></div><span className="audit-page__count">{logs.length} entries</span></div>

    <nav className="audit-filters" aria-label="Filter by admin">
      <Link className={`filter-pill${selectedAdmin === "all" ? " is-active" : ""}`} href="/dashboard/admin/audit"><i className="fa-solid fa-layer-group"/> All admins</Link>
      {admins.map(admin => <Link key={admin.id} className={`filter-pill audit-filter-admin${selectedAdmin === admin.id ? " is-active" : ""}`} href={`/dashboard/admin/audit?admin=${admin.id}`}>
        <span className="audit-avatar"><SafeAvatarImage src={admin.avatarUrl} frame={admin} alt="" /></span>{admin.name || admin.email}
      </Link>)}
      <Link className={`filter-pill${selectedAdmin === "system" ? " is-active" : ""}`} href="/dashboard/admin/audit?admin=system"><i className="fa-solid fa-gear"/> System</Link>
    </nav>

    <div className="audit-list">
      {logs.map(log => {
        const actor = log.actorId ? actors.get(log.actorId) : null;
        return <article className="audit-entry" key={log.id}>
          <div className="audit-entry__actor">
            <span className="audit-avatar audit-avatar--large">{actor ? <SafeAvatarImage src={actor.avatarUrl} frame={actor} alt="" /> : <i className="fa-solid fa-gear"/>}</span>
            <span><strong>{actor?.name || actor?.email || (log.actorId ? "Deleted admin" : "System")}</strong><time>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}</time></span>
          </div>
          <div className="audit-entry__event"><span className="status-badge">{actionLabel(log.action)}</span><strong>{log.entityType}</strong>{log.entityId && <code title={log.entityId}>{log.entityId}</code>}</div>
          <p className="audit-entry__reason">{log.reason || "No reason provided"}</p>
          <details className="audit-entry__change"><summary><i className="fa-solid fa-code-compare"/> View changes</summary><div className="audit-change-grid"><section><span>Before</span><pre>{JSON.stringify(log.before, null, 2) || "—"}</pre></section><section><span>After</span><pre>{JSON.stringify(log.after, null, 2) || "—"}</pre></section></div></details>
        </article>;
      })}
      {!logs.length && <div className="empty-state"><i className="fa-solid fa-clock-rotate-left"/><strong>No activity for this admin</strong><span>Choose another filter to see more entries.</span></div>}
    </div>
  </section>;
}
