import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SupportTicketList, type SupportTicketRow } from "@/components/dashboard/SupportTicketList";

export const metadata: Metadata = { title: "Support tickets" };
export const dynamic = "force-dynamic";

export default async function TeammateDisputesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [teammate, tickets] = await Promise.all([
    prisma.teammate.findUnique({
      where: { userId: session.user.id },
      select: { candidacies: { where: { selected: true }, select: { order: { select: { id: true, orderNo: true, gameName: true, option: true } } }, orderBy: { invitedAt: "desc" }, take: 50 } },
    }),
    prisma.dispute.findMany({
      where: { openedById: session.user.id },
      // Public notes only — see the note on the customer page.
      include: { notes: { where: { internal: false }, orderBy: { createdAt: "asc" }, select: { id: true, body: true, authorRole: true, createdAt: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const orders = teammate?.candidacies.map(({ order }) => order) ?? [];
  // Same as the customer page: a ticket older than the fifty sessions offered
  // above still has to be able to name its order.
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
    amountEUR: ticket.amountEUR === null ? null : Number(ticket.amountEUR),
    closedByReporter: ticket.closedByReporter,
    orderId: ticket.orderId,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    messages: ticket.notes,
  }));

  return <section className="dashboard-panel admin-ops-page">
    <div className="dashboard-panel__head">
      <div>
        <div className="dashboard-panel__title">Support tickets</div>
        <div className="dashboard-panel__sub">Report a problem tied to one of your sessions</div>
      </div>
    </div>
    <SupportTicketList tickets={rows} orders={orders} orderLabels={orderLabels} hint="Pick the session it happened in so we can see the order and the chat alongside your report." />
  </section>;
}
