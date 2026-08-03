import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PriceTag } from "@/components/currency/PriceTag";

export const metadata: Metadata = { title: "Orders & Sessions" };
export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  COMPLETED: "dashboard-pill--success",
  ASSIGNED: "dashboard-pill--success",
  IN_PROGRESS: "dashboard-pill--success",
  CANCELLED: "dashboard-pill--warning",
  NO_MATCH: "dashboard-pill--muted",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      clientUser: true,
      games: { orderBy: { gameNumber: "asc" } },
      review: true,
      candidates: { where: { selected: true }, include: { teammate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">All orders & sessions</div>
          <div className="dashboard-panel__sub">Every booking across all clients and teammates · {orders.length} total</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="dashboard-empty"><i className="fa-solid fa-receipt" aria-hidden="true" /><p>No orders yet.</p></div>
      ) : (
        <div className="admin-orders-table-wrap">
          <table className="dashboard-table admin-orders-table">
            <thead>
              <tr><th>Order</th><th>Client</th><th>Game</th><th>Teammate</th><th>Games</th><th>Value</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>#{order.id.slice(-6)}</strong></td>
                  <td>{order.clientUser?.name || order.clientUser?.email || order.customerLabel}</td>
                  <td><strong>{order.gameName}</strong><small>{order.option}</small></td>
                  <td>
                    {order.candidates.length > 0
                      ? order.candidates.map((candidate) => (
                          <Link key={candidate.teammateId} href={`/dashboard/admin/teammates/${candidate.teammate.teammateNo}`}>{candidate.teammate.name}</Link>
                        ))
                      : "—"}
                  </td>
                  <td>{order.games.length} / {order.gamesBooked}</td>
                  <td><PriceTag amountEUR={Number(order.priceEUR)} /></td>
                  <td>
                    <span className={`dashboard-pill ${STATUS_CLASS[order.status] ?? "dashboard-pill--warning"}`}>{order.status.toLowerCase().replaceAll("_", " ")}</span>
                    {order.sessionStatus && <small>{order.sessionStatus.toLowerCase().replaceAll("_", " ")}</small>}
                  </td>
                  <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
