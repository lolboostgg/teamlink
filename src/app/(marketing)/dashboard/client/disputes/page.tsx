import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { openDispute } from "@/app/dashboard/disputes/actions";

export const metadata: Metadata = { title: "Support tickets" };
export const dynamic = "force-dynamic";

export default async function ClientDisputesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({ where: { clientUserId: session.user.id }, select: { id: true, orderNo: true, gameName: true, option: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.dispute.findMany({ where: { openedById: session.user.id }, orderBy: { updatedAt: "desc" } }),
  ]);
  return <div className="dashboard-panel admin-ops-page"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Support tickets</div><div className="dashboard-panel__sub">Tell us what happened in a specific order</div></div></div>
    <form action={openDispute} className="ops-create-form"><select name="orderId" required><option value="">Choose an order</option>{orders.map(o => <option value={o.id} key={o.id}>#{o.orderNo} · {o.gameName} · {o.option}</option>)}</select><input name="title" required maxLength={120} placeholder="Short summary"/><textarea name="description" required minLength={10} placeholder="What happened?"/><button className="btn btn--vivid">Open ticket</button></form>
    <div className="admin-ticket-list">{tickets.map(ticket => <article className="admin-ticket" key={ticket.id}><header><div><span className={`status-badge status-${ticket.status.toLowerCase()}`}>{ticket.status}</span><h3>{ticket.title}</h3></div></header><p>{ticket.description}</p>{ticket.resolutionNote && <div className="admin-ticket__context">Resolution: {ticket.resolutionNote}</div>}</article>)}</div>
  </div>;
}
