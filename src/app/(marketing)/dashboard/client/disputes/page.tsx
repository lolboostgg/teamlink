import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SupportTicketList, type SupportTicketRow } from "@/components/dashboard/SupportTicketList";

export const metadata: Metadata = { title: "Support tickets" };
export const dynamic = "force-dynamic";

export default async function ClientDisputesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({ where: { clientUserId: session.user.id }, select: { id: true, orderNo: true, gameName: true, option: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.dispute.findMany({
      where: { openedById: session.user.id },
      // Public notes only. `internal` is the access rule for the whole
      // conversation, and it is applied here rather than in the component so
      // an internal remark cannot reach the client bundle at all.
      include: { notes: { where: { internal: false }, orderBy: { createdAt: "asc" }, select: { id: true, body: true, authorRole: true, createdAt: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  // A ticket can outlive the fifty orders the picker offers, and a card that
  // can't name the order it is about is half a card. Only the ones missing
  // from the list above are looked up, so the common case costs nothing.
  const known = new Set(orders.map((order) => order.id));
  const missing = [...new Set(tickets.flatMap((ticket) => ticket.orderId && !known.has(ticket.orderId) ? [ticket.orderId] : []))];
  const older = missing.length
    ? await prisma.order.findMany({ where: { id: { in: missing } }, select: { id: true, orderNo: true, gameName: true, option: true } })
    : [];
  const orderLabels = new Map([...orders, ...older].map((order) => [order.id, `#${order.orderNo} · ${order.gameName}`]));

  const rows: SupportTicketRow[] = tickets.map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    resolution: ticket.resolution,
    resolutionNote: ticket.resolutionNote,
    // Prisma hands Decimal back as its own type, which cannot cross the
    // server/client boundary or be formatted with toFixed.
    amountEUR: ticket.amountEUR === null ? null : Number(ticket.amountEUR),
    closedByReporter: ticket.closedByReporter,
    orderId: ticket.orderId,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    messages: ticket.notes,
  }));

  return <div className="dashboard-panel admin-ops-page">
    <div className="dashboard-panel__head">
      <div>
        <div className="dashboard-panel__title">Support tickets</div>
        <div className="dashboard-panel__sub">Tell us what happened in a specific order</div>
      </div>
    </div>
    <SupportTicketList tickets={rows} orders={orders} orderLabels={orderLabels} hint="Pick the order it happened in and we'll have the session in front of us when we read it." />
  </div>;
}
