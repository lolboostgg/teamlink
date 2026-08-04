import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import { PayoutRequestQueue, type AdminPayoutRow } from "@/components/dashboard/admin/PayoutRequestQueue";
import { describePayoutMethod, type PayoutMethodType } from "@/lib/payoutMethods";
import { nextPayoutDate, payoutBreakdown, type PayoutRequestStatus } from "@/lib/payouts";

export const metadata: Metadata = { title: "Payouts & Disputes" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function AdminPayoutsPage() {
  const [requests, owedAgg, paidAgg] = await Promise.all([
    prisma.payoutRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        payoutMethod: true,
        teammate: { select: { teammateNo: true, name: true, avatarUrl: true, balanceEUR: true } },
      },
    }),
    // What the platform owes in total, whether or not anyone has asked for it.
    prisma.teammate.aggregate({ _sum: { balanceEUR: true } }),
    prisma.payoutRequest.aggregate({ where: { status: "PAID" }, _sum: { netEUR: true, feeEUR: true } }),
  ]);

  const rows: AdminPayoutRow[] = requests.map((request) => ({
    id: request.id,
    requestNo: request.requestNo,
    status: request.status as PayoutRequestStatus,
    teammateNo: request.teammate.teammateNo,
    teammateName: request.teammate.name,
    teammateAvatar: request.teammate.avatarUrl,
    balanceEUR: Number(request.teammate.balanceEUR),
    amountEUR: request.amountEUR === null ? null : Number(request.amountEUR),
    feePercent: Number(request.feePercent),
    note: request.note,
    adminNote: request.adminNote,
    grossEUR: request.grossEUR === null ? null : Number(request.grossEUR),
    netEUR: request.netEUR === null ? null : Number(request.netEUR),
    methodType: request.payoutMethod.type as PayoutMethodType,
    methodSummary: describePayoutMethod(
      request.payoutMethod.type as PayoutMethodType,
      (request.payoutMethod.details as Record<string, string> | null) ?? {},
    ),
    createdAt: request.createdAt.getTime(),
    processedAt: request.processedAt?.getTime() ?? null,
  }));

  const pendingRows = rows.filter((row) => row.status === "PENDING");
  // Quoted against each teammate's live balance, same as the queue shows.
  const pendingNet = pendingRows.reduce(
    (sum, row) => sum + payoutBreakdown(row.amountEUR ?? row.balanceEUR, row.feePercent).net,
    0,
  );

  return (
    <>
      <LiveRefresh />

      <StatGrid>
        <StatCard icon="fa-solid fa-inbox" label="Awaiting processing" value={pendingRows.length} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-paper-plane" label="Pending payout value" value={pendingNet} currency color="var(--accent)" />
        <StatCard icon="fa-solid fa-scale-balanced" label="Owed to teammates" value={Number(owedAgg._sum.balanceEUR ?? 0)} currency color="var(--hue-purple)" />
        <StatCard icon="fa-solid fa-coins" label="Fees collected" value={Number(paidAgg._sum.feeEUR ?? 0)} currency color="var(--hue-green)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Payout requests</div>
            <div className="dashboard-panel__sub">
              Next scheduled run {dateFormat.format(nextPayoutDate())} &middot; confirming a payout books it against the
              teammate&rsquo;s ledger and takes it off their balance
            </div>
          </div>
        </div>
        <PayoutRequestQueue rows={rows} />
      </div>
    </>
  );
}
