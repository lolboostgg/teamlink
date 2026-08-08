import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PriceTag } from "@/components/currency/PriceTag";
import { AdminTableToolbar } from "@/components/dashboard/admin/AdminTableToolbar";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";
import { GameMark } from "@/components/dashboard/GameMark";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
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
  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);
  const orders = await prisma.order.findMany({
    where,
    include: {
      clientUser: true,
      games: { orderBy: { gameNumber: "asc" } },
      candidates: { where: { selected: true }, include: { teammate: true } },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
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

      <AdminTableToolbar
        initialQuery={q}
        placeholder="Search order, client, game or teammate…"
        searchLabel="Search orders"
        filters={[{
          param: "status",
          value: status ?? "",
          options: [
            { value: "", label: "All statuses", icon: "fa-solid fa-layer-group" },
            ...Object.values(OrderStatus).map((value) => ({ value, label: value.toLowerCase().replaceAll("_", " ") })),
          ],
        }]}
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
                <td>{order.clientUser ? <Link className="admin-order-person" href={`/dashboard/admin/accounts/${order.clientUser.accountNo}`}><span><SafeAvatarImage src={order.clientUser.avatarUrl} /></span><strong>{order.clientUser.name || order.clientUser.email}</strong></Link> : <span className="admin-order-person"><span><SafeAvatarImage /></span><strong>{order.customerLabel}</strong></span>}</td>
                <td><span className="admin-order-game"><GameMark slug={order.gameSlug} /><span><strong>{order.gameName}</strong><small>{order.option}</small></span></span></td>
                <td>{order.candidates.length ? order.candidates.map((candidate) => <Link className="admin-order-person" key={candidate.teammateId} href={`/dashboard/admin/teammates/${candidate.teammate.teammateNo}`}><span><SafeAvatarImage src={candidate.teammate.avatarUrl} /></span><strong>{candidate.teammate.name}</strong></Link>) : "—"}</td>
                <td>{order.games.length} / {order.gamesBooked}</td>
                <td><PriceTag amountEUR={Number(order.priceEUR)} /></td>
                <td><span className={`dashboard-pill ${STATUS_CLASS[order.status] ?? "dashboard-pill--warning"}`}>{order.status.toLowerCase().replaceAll("_", " ")}</span>{order.sessionStatus && order.sessionStatus !== "ORDER_COMPLETED" && <small>{order.sessionStatus.toLowerCase().replaceAll("_", " ")}</small>}</td>
                <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</td>
                <td><Link href={`/dashboard/admin/orders/${order.orderNo}`} className="btn btn--ghost btn--sm admin-order-view"><i className="fa-solid fa-eye" /> View</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} hrefFor={pageHref} label="Orders pagination" />
    </div>
  );
}
