import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { DisputeBoard, type DisputeRow } from "@/components/dashboard/admin/DisputeBoard";

export const metadata: Metadata = { title: "Disputes" };
export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  await requireAdmin("support");
  const [disputes, admins] = await Promise.all([
    prisma.dispute.findMany({ include: { notes: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true } }),
  ]);
  const orderIds = disputes.flatMap((item) => item.orderId ? [item.orderId] : []);
  const orders = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true, gameName: true, status: true, games: { select: { id: true } }, _count: { select: { candidates: true } } } })
    : [];
  const orderMap = new Map(orders.map((order) => [order.id, order]));

  // Dates and Decimals are flattened here rather than in the board: neither
  // survives the server/client boundary, and the component that renders them
  // should not be the one that knows they came out of Prisma.
  const rows: DisputeRow[] = disputes.map((item) => {
    const order = item.orderId ? orderMap.get(item.orderId) : null;
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      openedByRole: item.openedByRole,
      assigneeId: item.assigneeId,
      closedByReporter: item.closedByReporter,
      resolution: item.resolution,
      resolutionNote: item.resolutionNote,
      amountEUR: item.amountEUR === null ? null : Number(item.amountEUR),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      messages: item.notes.map((note) => ({
        id: note.id,
        body: note.body,
        authorRole: note.authorRole,
        internal: note.internal,
        createdAt: note.createdAt.toISOString(),
      })),
      order: order ? { id: order.id, orderNo: order.orderNo, gameName: order.gameName, status: order.status, candidates: order._count.candidates, reports: order.games.length } : null,
    };
  });

  return <section className="dashboard-panel admin-ops-page">
    <div className="dashboard-panel__head"><div>
      <div className="dashboard-panel__title">Disputes &amp; tickets</div>
      <div className="dashboard-panel__sub">The support queue — pick a ticket to read the conversation and act on it</div>
    </div></div>
    <DisputeBoard tickets={rows} admins={admins.map((admin) => ({ id: admin.id, label: admin.name || admin.email }))} />
  </section>;
}
