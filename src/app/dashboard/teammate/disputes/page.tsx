import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { openDispute } from "@/app/dashboard/disputes/actions";
import { DashboardSelect } from "@/components/dashboard/DashboardSelect";

export const metadata: Metadata = { title: "Support tickets" };
export const dynamic = "force-dynamic";

export default async function TeammateDisputesPage() {
  const session = await auth(); if (!session?.user?.id) return null;
  const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id }, select: { candidacies: { where: { selected: true }, select: { order: { select: { id: true, orderNo: true, gameName: true, option: true } } }, orderBy: { invitedAt: "desc" }, take: 50 } } });
  const tickets = await prisma.dispute.findMany({ where: { openedById: session.user.id }, orderBy: { updatedAt: "desc" } });
  return <section className="dashboard-panel admin-ops-page"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Support tickets</div><div className="dashboard-panel__sub">Report a problem tied to one of your sessions</div></div></div>
    <form action={openDispute} className="ops-create-form"><DashboardSelect name="orderId" value="" label="Order" placeholder="Choose an order" options={[{value:"",label:"Choose an order"},...(teammate?.candidacies.map(({order:o}) => ({value:o.id,label:`#${o.orderNo} · ${o.gameName} · ${o.option}`})) ?? [])]}/><input name="title" required maxLength={120} placeholder="Short summary"/><textarea name="description" required minLength={10} placeholder="What happened?"/><button className="btn btn--vivid">Open ticket</button></form>
    <div className="admin-ticket-list">{tickets.map(ticket => <article className="admin-ticket" key={ticket.id}><header><div><span className={`status-badge status-${ticket.status.toLowerCase()}`}>{ticket.status}</span><h3>{ticket.title}</h3></div></header><p>{ticket.description}</p>{ticket.resolutionNote && <div className="admin-ticket__context">Resolution: {ticket.resolutionNote}</div>}</article>)}</div>
  </section>;
}
