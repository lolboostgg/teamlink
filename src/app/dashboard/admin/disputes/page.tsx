import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { resolveDispute, updateDispute } from "./actions";

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
      <form action={updateDispute} className="admin-ticket__form"><input type="hidden" name="id" value={item.id}/><select name="status" defaultValue={item.status}>{["OPEN","INVESTIGATING","WAITING","RESOLVED"].map(v => <option key={v}>{v}</option>)}</select><select name="assigneeId" defaultValue={item.assigneeId ?? ""}><option value="">Unassigned</option>{admins.map(a => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}</select><input name="note" placeholder="Internal note…"/><button className="btn btn--ghost btn--sm">Update</button></form>
      <form action={resolveDispute} className="admin-ticket__form"><input type="hidden" name="id" value={item.id}/><select name="resolution" defaultValue="REJECTED">{["REFUND","PARTIAL_REFUND","CREDIT","REJECTED","OTHER","TEAMMATE_NO_SHOW"].map(v => <option key={v}>{v.replaceAll("_", " ")}</option>)}</select><input name="amountEUR" type="number" min="0" step="0.01" placeholder="€ amount"/><input name="note" required placeholder="Resolution and reason…"/><button className="btn btn--vivid btn--sm">Resolve</button></form>
      {!!item.notes.length && <details><summary>{item.notes.length} internal notes</summary>{item.notes.map(n => <p key={n.id}><small>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(n.createdAt)}</small> {n.body}</p>)}</details>}
    </article>; })}{!disputes.length && <div className="empty-state">No disputes yet.</div>}</div>
  </section>;
}
