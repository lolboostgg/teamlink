import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { revokeSanction } from "./actions";
import { SanctionCreateForm } from "@/components/dashboard/admin/SanctionCreateForm";

export const metadata: Metadata = { title: "Teammate sanctions" };
export const dynamic = "force-dynamic";

export default async function SanctionsPage() {
  await requireAdmin("operations");
  await prisma.teammateSanction.updateMany({ where: { status: "ACTIVE", endsAt: { lte: new Date() } }, data: { status: "EXPIRED" } });
  const [teammates, sanctions] = await Promise.all([prisma.teammate.findMany({ select: { id: true, teammateNo: true, name: true, avatarUrl: true }, orderBy: { name: "asc" } }), prisma.teammateSanction.findMany({ orderBy: { createdAt: "desc" }, take: 200 })]);
  const names = new Map(teammates.map(t => [t.id, `${t.name} · #${t.teammateNo}`]));
  return <section className="dashboard-panel admin-ops-page"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Teammate sanctions</div><div className="dashboard-panel__sub">Warnings and suspensions never interrupt a running session</div></div></div>
    <SanctionCreateForm teammates={teammates}/>
    <div className="admin-ops-table-wrap"><table className="admin-ops-table"><thead><tr><th>Teammate</th><th>Type</th><th>Status</th><th>Reason</th><th>Starts</th><th>Ends</th><th></th></tr></thead><tbody>{sanctions.map(s => <tr key={s.id}><td>{names.get(s.teammateId) ?? s.teammateId}</td><td>{s.type.replaceAll("_", " ")}</td><td><span className={`status-badge status-${s.status.toLowerCase()}`}>{s.status}</span></td><td>{s.reason}{s.internalNote && <small className="admin-ops-note">{s.internalNote}</small>}</td><td>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(s.startsAt)}</td><td>{s.endsAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(s.endsAt) : "—"}</td><td>{s.status === "ACTIVE" && <form action={revokeSanction}><input type="hidden" name="id" value={s.id}/><button className="btn btn--ghost btn--sm">Revoke</button></form>}</td></tr>)}</tbody></table></div>
  </section>;
}
