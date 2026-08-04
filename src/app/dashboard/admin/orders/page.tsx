import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PriceTag } from "@/components/currency/PriceTag";
import { AdminOrdersToolbar } from "@/components/dashboard/admin/AdminOrdersToolbar";
import { OrderStatus, Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Orders & Sessions" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUS_CLASS: Record<string, string> = {
  COMPLETED: "dashboard-pill--success", ASSIGNED: "dashboard-pill--success", IN_PROGRESS: "dashboard-pill--success",
  CANCELLED: "dashboard-pill--warning", CANCEL_PENDING: "dashboard-pill--warning", NO_MATCH: "dashboard-pill--muted",
};

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const status = Object.values(OrderStatus).includes(params.status as OrderStatus) ? params.status as OrderStatus : undefined;
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [
      { id: { contains: q, mode: "insensitive" } },
      ...(/^#?\d+$/.test(q) ? [{ orderNo: Number.parseInt(q.replace("#", ""), 10) }] : []),
      { customerLabel: { contains: q, mode: "insensitive" } },
      { gameName: { contains: q, mode: "insensitive" } },
      { clientUser: { is: { email: { contains: q, mode: "insensitive" } } } },
      { candidates: { some: { selected: true, teammate: { name: { contains: q, mode: "insensitive" } } } } },
    ] } : {}),
  };
  const total = await prisma.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const orders = await prisma.order.findMany({
    where,
    include: {
      clientUser: true,
      games: { orderBy: { gameNumber: "asc" } },
      candidates: { where: { selected: true }, include: { teammate: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    next.set("page", String(nextPage));
    return `/dashboard/admin/orders?${next}`;
  };

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">All orders & sessions</div>
          <div className="dashboard-panel__sub">Every booking across all clients and teammates · {total} matching</div>
        </div>
      </div>

      <AdminOrdersToolbar
        initialQuery={q}
        initialStatus={status ?? ""}
        statusOptions={[
            { value: "", label: "All statuses", icon: "fa-solid fa-layer-group" },
            ...Object.values(OrderStatus).map((value) => ({ value, label: value.toLowerCase().replaceAll("_", " ") })),
        ]}
      />

      {orders.length === 0 ? (
        <div className="dashboard-empty"><i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" /><p>No matching orders.</p></div>
      ) : (
        <div className="admin-orders-table-wrap">
          <table className="dashboard-table admin-orders-table">
            <thead><tr><th>Order</th><th>Client</th><th>Game</th><th>Teammate</th><th>Games</th><th>Value</th><th>Status</th><th>Date</th><th /></tr></thead>
            <tbody>{orders.map((order) => (
              <tr key={order.id}>
                <td><strong>#{order.orderNo}</strong></td>
                <td>{order.clientUser?.name || order.clientUser?.email || order.customerLabel}</td>
                <td><strong>{order.gameName}</strong><small>{order.option}</small></td>
                <td>{order.candidates.length ? order.candidates.map((candidate) => <Link key={candidate.teammateId} href={`/dashboard/admin/teammates/${candidate.teammate.teammateNo}`}>{candidate.teammate.name}</Link>) : "—"}</td>
                <td>{order.games.length} / {order.gamesBooked}</td>
                <td><PriceTag amountEUR={Number(order.priceEUR)} /></td>
                <td><span className={`dashboard-pill ${STATUS_CLASS[order.status] ?? "dashboard-pill--warning"}`}>{order.status.toLowerCase().replaceAll("_", " ")}</span>{order.sessionStatus && <small>{order.sessionStatus.toLowerCase().replaceAll("_", " ")}</small>}</td>
                <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</td>
                <td><Link href={`/dashboard/admin/orders/${order.id}`} className="btn btn--ghost btn--sm">Inspect</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && <nav className="orders-pagination" aria-label="Orders pagination">
        <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
        <div className="orders-pagination__buttons">
          {page > 1 ? <Link className="btn btn--ghost btn--sm" href={pageHref(page - 1)}><i className="fa-solid fa-chevron-left" /> Previous</Link> : <span className="btn btn--ghost btn--sm is-disabled">Previous</span>}
          <span className="orders-pagination__page">Page {page} of {pageCount}</span>
          {page < pageCount ? <Link className="btn btn--ghost btn--sm" href={pageHref(page + 1)}>Next <i className="fa-solid fa-chevron-right" /></Link> : <span className="btn btn--ghost btn--sm is-disabled">Next</span>}
        </div>
      </nav>}
    </div>
  );
}
