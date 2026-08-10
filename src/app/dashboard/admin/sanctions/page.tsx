import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { createSanction, revokeSanction } from "./actions";

export const metadata: Metadata = { title: "Teammate sanctions" };
export const dynamic = "force-dynamic";

export default async function SanctionsPage() {
  await requireAdmin("operations");
  await prisma.teammateSanction.updateMany({ where: { status: "ACTIVE", endsAt: { lte: new Date() } }, data: { status: "EXPIRED" } });
  const [teammates, sanctions] = await Promise.all([prisma.teammate.findMany({ select: { id: true, teammateNo: true, name: true }, orderBy: { name: "asc" } }), prisma.teammateSanction.findMany({ orderBy: { createdAt: "desc" }, take: 200 })]);
  const names = new Map(teammates.map(t => [t.id, `${t.name} · #${t.teammateNo}`]));
  return <section className="dashboard-panel admin-ops-page"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Teammate sanctions</div><div className="dashboard-panel__sub">Warnings and suspensions never interrupt a running session</div></div></div>
    <form action={createSanction} className="ops-create-form ops-create-form--row"><select name="teammateId" required><option value="">Choose teammate</option>{teammates.map(t => <option value={t.id} key={t.id}>{t.name} · #{t.teammateNo}</option>)}</select><select name="type"><option>WARNING</option><option>TEMP_SUSPENSION</option><option>BAN</option></select><input name="hours" type="number" min="1" defaultValue="24" title="Duration in hours"/><input name="reason" required placeholder="Reason shown in history"/><input name="internalNote" placeholder="Internal note"/><button className="btn btn--vivid btn--sm">Apply</button></form>
    <div className="admin-ops-table-wrap"><table className="admin-ops-table"><thead><tr><th>Teammate</th><th>Type</th><th>Status</th><th>Reason</th><th>Starts</th><th>Ends</th><th></th></tr></thead><tbody>{sanctions.map(s => <tr key={s.id}><td>{names.get(s.teammateId) ?? s.teammateId}</td><td>{s.type.replaceAll("_", " ")}</td><td><span className={`status-badge status-${s.status.toLowerCase()}`}>{s.status}</span></td><td>{s.reason}{s.internalNote && <small className="admin-ops-note">{s.internalNote}</small>}</td><td>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(s.startsAt)}</td><td>{s.endsAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(s.endsAt) : "—"}</td><td>{s.status === "ACTIVE" && <form action={revokeSanction}><input type="hidden" name="id" value={s.id}/><button className="btn btn--ghost btn--sm">Revoke</button></form>}</td></tr>)}</tbody></table></div>
  </section>;
}
