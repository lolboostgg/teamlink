import { prisma } from "@/lib/db";
import { payoutForOrder } from "@/lib/payoutSplit";

export type EarningType = "ORDER_PAYOUT" | "PAYOUT_SENT" | "ADJUSTMENT";

export interface EarningRow {
  id: string;
  type: EarningType;
  amountEUR: number;
  note: string | null;
  createdAt: number;
  order: { orderNo: number; gameName: string; option: string } | null;
}

export interface EarningsSummary {
  /** Booked and available, straight off the teammate row. */
  balanceEUR: number;
  /** What assigned/in-progress orders will add once they complete. */
  pendingEUR: number;
  /** Everything ever credited from completed orders. */
  earnedEUR: number;
  /** Everything ever paid out (a positive number). */
  paidOutEUR: number;
  rows: EarningRow[];
}

export const EARNING_LABELS: Record<EarningType, string> = {
  ORDER_PAYOUT: "Session payout",
  PAYOUT_SENT: "Paid out",
  ADJUSTMENT: "Adjustment",
};

/**
 * The full earnings picture for one teammate, shared by their own payments
 * page and the admin's view of them — two places showing different numbers
 * for the same money is how trust in a payout system dies.
 */
export async function loadTeammateEarnings(teammateId: string, take = 100): Promise<EarningsSummary> {
  const [teammate, rows, inFlight] = await Promise.all([
    prisma.teammate.findUnique({ where: { id: teammateId }, select: { balanceEUR: true } }),
    prisma.teammateEarning.findMany({
      where: { teammateId },
      orderBy: { createdAt: "desc" },
      take,
      include: { order: { select: { orderNo: true, gameName: true, option: true } } },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
        candidates: { some: { teammateId, selected: true } },
      },
      select: {
        priceEUR: true,
        teammatePayoutEUR: true,
        _count: { select: { candidates: { where: { selected: true } } } },
      },
    }),
  ]);

  // Same split rule as creditOrderPayout(): the order's pot divided across
  // everyone selected for it.
  const pendingEUR = inFlight.reduce(
    (sum, order) => sum + payoutForOrder(order) / Math.max(1, order._count.candidates),
    0,
  );

  let earnedEUR = 0;
  let paidOutEUR = 0;
  for (const row of rows) {
    const amount = Number(row.amountEUR);
    if (row.type === "ORDER_PAYOUT") earnedEUR += amount;
    if (row.type === "PAYOUT_SENT") paidOutEUR += Math.abs(amount);
  }

  return {
    balanceEUR: Number(teammate?.balanceEUR ?? 0),
    pendingEUR,
    earnedEUR,
    paidOutEUR,
    rows: rows.map((row) => ({
      id: row.id,
      type: row.type as EarningType,
      amountEUR: Number(row.amountEUR),
      note: row.note,
      createdAt: row.createdAt.getTime(),
      order: row.order ? { orderNo: row.order.orderNo, gameName: row.order.gameName, option: row.order.option } : null,
    })),
  };
}
