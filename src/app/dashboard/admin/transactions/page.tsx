import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PriceTag } from "@/components/currency/PriceTag";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { AdminTableToolbar } from "@/components/dashboard/admin/AdminTableToolbar";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { CreditTxType, Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const TYPE_PILL: Record<string, string> = {
  TOPUP: "dashboard-pill--success",
  BONUS: "dashboard-pill--success",
  REFUND: "dashboard-pill--warning",
  SPEND: "dashboard-pill--muted",
  ADMIN_ADJUST: "dashboard-pill--warning",
};

const TYPE_LABEL: Record<string, string> = {
  TOPUP: "Top-up",
  BONUS: "Package bonus",
  SPEND: "Spent",
  REFUND: "Refund",
  ADMIN_ADJUST: "Admin adjustment",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

type Props = { searchParams: Promise<{ q?: string; type?: string; page?: string }> };

export default async function AdminTransactionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const type = Object.values(CreditTxType).includes(params.type as CreditTxType)
    ? (params.type as CreditTxType)
    : undefined;

  const where: Prisma.CreditTransactionWhereInput = {
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { note: { contains: q, mode: "insensitive" as const } },
            { user: { is: { email: { contains: q, mode: "insensitive" as const } } } },
            { user: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            ...(/^#?\d+$/.test(q) ? [{ user: { is: { accountNo: Number.parseInt(q.replace("#", ""), 10) } } }] : []),
          ],
        }
      : {}),
  };

  // Totals cover the whole ledger, not the current page — a per-page sum
  // would silently change every time you turn a page.
  const [total, byType] = await Promise.all([
    prisma.creditTransaction.count({ where }),
    prisma.creditTransaction.groupBy({ by: ["type"], _sum: { amountCents: true }, _count: { _all: true } }),
  ]);

  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);
  const rows = await prisma.creditTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { accountNo: true, name: true, email: true, avatarUrl: true } } },
    skip,
    take,
  });

  const sumFor = (value: CreditTxType) =>
    (byType.find((row) => row.type === value)?._sum.amountCents ?? 0) / 100;

  const hrefFor = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (type) next.set("type", type);
    next.set("page", String(nextPage));
    return `/dashboard/admin/transactions?${next}`;
  };

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-arrow-down-to-line" label="Topped up" value={sumFor(CreditTxType.TOPUP)} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-gift" label="Bonus granted" value={sumFor(CreditTxType.BONUS)} currency color="var(--hue-purple)" />
        <StatCard icon="fa-solid fa-cart-shopping" label="Spent on orders" value={Math.abs(sumFor(CreditTxType.SPEND))} currency color="var(--accent)" />
        <StatCard icon="fa-solid fa-rotate-left" label="Refunded" value={sumFor(CreditTxType.REFUND)} currency color="var(--hue-gold)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Client transactions</div>
            <div className="dashboard-panel__sub">
              Every store-credit movement across all accounts &middot; {total} matching
            </div>
          </div>
        </div>

        <AdminTableToolbar
          initialQuery={q}
          placeholder="Search client, email, account no or note…"
          searchLabel="Search transactions"
          filters={[{
            param: "type",
            value: type ?? "",
            options: [
              { value: "", label: "All types", icon: "fa-solid fa-layer-group" },
              { value: CreditTxType.TOPUP, label: "Top-ups", icon: "fa-solid fa-arrow-down-to-line" },
              { value: CreditTxType.BONUS, label: "Bonuses", icon: "fa-solid fa-gift" },
              { value: CreditTxType.SPEND, label: "Spend", icon: "fa-solid fa-cart-shopping" },
              { value: CreditTxType.REFUND, label: "Refunds", icon: "fa-solid fa-rotate-left" },
              { value: CreditTxType.ADMIN_ADJUST, label: "Adjustments", icon: "fa-solid fa-sliders" },
            ],
          }]}
        />

        {rows.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" />
            <p>No matching transactions.</p>
          </div>
        ) : (
          <div className="admin-orders-table-wrap">
            <table className="dashboard-table earnings-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Note</th>
                  <th>Date</th>
                  <th className="earnings-table__amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="admin-order-person" href={`/dashboard/admin/accounts/${row.user.accountNo}`}>
                        <span>
                          <SafeAvatarImage src={row.user.avatarUrl} />
                        </span>
                        <strong>{row.user.name || row.user.email}</strong>
                      </Link>
                    </td>
                    <td>
                      <span className={`dashboard-pill ${TYPE_PILL[row.type] ?? "dashboard-pill--muted"}`}>
                        {TYPE_LABEL[row.type] ?? row.type}
                      </span>
                    </td>
                    <td>{row.note || <span className="earnings-order__none">&mdash;</span>}</td>
                    <td>{dateFormat.format(row.createdAt)}</td>
                    <td className={`earnings-table__amount${row.amountCents < 0 ? " is-negative" : " is-positive"}`}>
                      {row.amountCents < 0 ? "−" : "+"}
                      <PriceTag amountEUR={Math.abs(row.amountCents) / 100} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={PAGE_SIZE}
          hrefFor={hrefFor}
          label="Transactions pagination"
        />
      </div>
    </>
  );
}
