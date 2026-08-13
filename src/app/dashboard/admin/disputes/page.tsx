import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { resolveDispute, updateDispute } from "./actions";
import { DashboardSelect } from "@/components/dashboard/DashboardSelect";

export const metadata: Metadata = { title: "Disputes" };
export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  await requireAdmin("support");
  const [disputes, admins] = await Promise.all([
    prisma.dispute.findMany({ include: { notes: { orderBy: { createdAt: "desc" } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true } }),
  ]);
  const orderIds = disputes.flatMap((item) => item.orderId ? [item.orderId] : []);
  const orders = await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true, gameName: true, status: true, games: { select: { id: true } }, _count: { select: { candidates: true } } } });
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  return <section className="dashboard-panel admin-ops-page"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Disputes & tickets</div><div className="dashboard-panel__sub">Order context, internal notes, ownership and financial resolution</div></div></div>
    <div className="admin-ticket-list">{disputes.map((item) => { const order = item.orderId ? orderMap.get(item.orderId) : null; return <article className="admin-ticket" key={item.id}>
      <header><div><span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span><h3>{item.title}</h3></div><time>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(item.createdAt)}</time></header>
      <p>{item.description}</p>{order && <div className="admin-ticket__context">Order #{order.orderNo} · {order.gameName} · {order.status} · {order._count.candidates} candidates · {order.games.length} game reports <span className="admin-ticket__links"><Link href={`/dashboard/admin/orders/${order.id}`}>Order & reports</Link><Link href={`/dashboard/admin/chat?q=${order.orderNo}`}>Linked chat</Link></span></div>}
      {/* Two forms, two jobs, and they were indistinguishable: one row of
          controls above another with nothing saying which one takes the
          money. Triage moves the ticket and is reversible; resolving pays
          out, sanctions the teammate and closes the ticket for good. */}
      <div className="admin-ticket__stage"><span className="admin-ticket__stage-label"><i className="fa-solid fa-arrows-turn-to-dots" aria-hidden="true"/> Triage — moves the ticket, tells the reporter</span>
        <form action={updateDispute} className="admin-ticket__form"><input type="hidden" name="id" value={item.id}/><DashboardSelect name="status" value={item.status} label="Status" options={["OPEN","INVESTIGATING","WAITING","RESOLVED"].map(v => ({value:v,label:v.replaceAll("_"," ")}))}/><DashboardSelect name="assigneeId" value={item.assigneeId ?? ""} label="Assigned admin" options={[{value:"",label:"Unassigned"},...admins.map(a => ({value:a.id,label:a.name || a.email}))]}/><input name="note" placeholder="Internal note…"/><button className="btn btn--ghost btn--sm">Update</button></form>
      </div>
      <div className="admin-ticket__stage admin-ticket__stage--final"><span className="admin-ticket__stage-label"><i className="fa-solid fa-gavel" aria-hidden="true"/> Resolve — pays out and closes the ticket</span>
        <form action={resolveDispute} className="admin-ticket__form"><input type="hidden" name="id" value={item.id}/><DashboardSelect name="resolution" value="REJECTED" label="Resolution" options={["REFUND","PARTIAL_REFUND","CREDIT","REJECTED","OTHER","TEAMMATE_NO_SHOW"].map(v => ({value:v,label:v.replaceAll("_", " ")}))}/><input name="amountEUR" type="number" min="0" step="0.01" placeholder="€ amount"/><input name="note" required placeholder="Resolution and reason — the reporter reads this…"/><button className="btn btn--vivid btn--sm">Resolve</button></form>
      </div>
      {!!item.notes.length && <details><summary>{item.notes.length} internal notes</summary>{item.notes.map(n => <p key={n.id}><small>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(n.createdAt)}</small> {n.body}</p>)}</details>}
    </article>; })}{!disputes.length && <div className="empty-state">No disputes yet.</div>}</div>
  </section>;
}
