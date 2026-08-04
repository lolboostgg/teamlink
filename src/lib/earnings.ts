/**
 * Shapes and labels for the earnings ledger.
 *
 * Deliberately free of any database import: the ledger is rendered inside
 * client components (the admin teammate detail page is one), and a value
 * imported from here would otherwise drag `prisma` — and with it `pg` and its
 * Node-only `net`/`tls`/`dns` dependencies — into the browser bundle. The
 * queries live in lib/teammateEarnings.ts, which is server-only.
 */

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
