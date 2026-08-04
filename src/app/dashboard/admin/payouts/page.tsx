import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import { TableFilterPills } from "@/components/dashboard/TableFilterPills";
import { PayoutRequestQueue, type AdminPayoutRow } from "@/components/dashboard/admin/PayoutRequestQueue";
import type { PayoutMethodType } from "@/lib/payoutMethods";
import { nextPayoutDate, payoutBreakdown, type PayoutRequestStatus } from "@/lib/payouts";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Payouts & Disputes" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

type Props = { searchParams: Promise<{ state?: string; method?: string }> };

export default async function AdminPayoutsPage({ searchParams }: Props) {
  const params = await searchParams;
  // "open" groups pending requests; the settled ones are worth seeing apart
  // from the ones that were never paid.
  const state = ["open", "paid", "rejected"].includes(params.state ?? "") ? params.state : undefined;
  const method = params.method === "BANK" || params.method === "CRYPTO" ? params.method : undefined;

  const where: Prisma.PayoutRequestWhereInput = {
    ...(state === "open" ? { status: "PENDING" } : {}),
    ...(state === "paid" ? { status: "PAID" } : {}),
    ...(state === "rejected" ? { status: { in: ["REJECTED", "CANCELLED"] } } : {}),
    ...(method ? { payoutMethod: { is: { type: method } } } : {}),
  };

  const [requests, owedAgg, paidAgg, openCount] = await Promise.all([
    prisma.payoutRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        payoutMethod: true,
        teammate: { select: { teammateNo: true, name: true, balanceEUR: true } },
      },
    }),
    // What the platform owes in total, whether or not anyone has asked for it.
    prisma.teammate.aggregate({ _sum: { balanceEUR: true } }),
    prisma.payoutRequest.aggregate({ where: { status: "PAID" }, _sum: { netEUR: true, feeEUR: true } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
  ]);

  const rows: AdminPayoutRow[] = requests.map((request) => ({
    id: request.id,
    requestNo: request.requestNo,
    status: request.status as PayoutRequestStatus,
    teammateNo: request.teammate.teammateNo,
    teammateName: request.teammate.name,
    balanceEUR: Number(request.teammate.balanceEUR),
    amountEUR: request.amountEUR === null ? null : Number(request.amountEUR),
    feePercent: Number(request.feePercent),
    note: request.note,
    adminNote: request.adminNote,
    grossEUR: request.grossEUR === null ? null : Number(request.grossEUR),
    netEUR: request.netEUR === null ? null : Number(request.netEUR),
    methodType: request.payoutMethod.type as PayoutMethodType,
    methodDetails: (request.payoutMethod.details as Record<string, string> | null) ?? {},
    createdAt: request.createdAt.getTime(),
    processedAt: request.processedAt?.getTime() ?? null,
  }));

  const pendingNet = rows
    .filter((row) => row.status === "PENDING")
    .reduce((sum, row) => sum + payoutBreakdown(row.amountEUR ?? row.balanceEUR, row.feePercent).net, 0);

  return (
    <>
      <LiveRefresh />

      <StatGrid>
        <StatCard icon="fa-solid fa-inbox" label="Awaiting processing" value={openCount} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-paper-plane" label="Pending payout value" value={pendingNet} currency color="var(--accent)" />
        <StatCard icon="fa-solid fa-scale-balanced" label="Owed to teammates" value={Number(owedAgg._sum.balanceEUR ?? 0)} currency color="var(--hue-purple)" />
        <StatCard icon="fa-solid fa-coins" label="Fees collected" value={Number(paidAgg._sum.feeEUR ?? 0)} currency color="var(--hue-green)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Payout requests</div>
            <div className="dashboard-panel__sub">
              Next scheduled run {dateFormat.format(nextPayoutDate())} &middot; completing a payout books it against the
              teammate&rsquo;s ledger and takes it off their balance
            </div>
          </div>
        </div>

        <TableFilterPills
          basePath="/dashboard/admin/payouts"
          groups={[
            {
              param: "state",
              label: "Request status",
              active: state ?? "",
              options: [
                { value: "", label: "All" },
                { value: "open", label: "Open", icon: "fa-solid fa-inbox" },
                { value: "paid", label: "Paid", icon: "fa-solid fa-check" },
                { value: "rejected", label: "Rejected", icon: "fa-solid fa-xmark" },
              ],
            },
            {
              param: "method",
              label: "Payout method",
              active: method ?? "",
              options: [
                { value: "", label: "All" },
                { value: "BANK", label: "Bank", icon: "fa-solid fa-building-columns" },
                { value: "CRYPTO", label: "Crypto", icon: "fa-brands fa-bitcoin" },
              ],
            },
          ]}
        />

        <PayoutRequestQueue rows={rows} />
      </div>
    </>
  );
}
