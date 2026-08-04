import type { PayoutMethodType } from "@/lib/payoutMethods";

/**
 * Percentage kept back per rail. No database import here on purpose — the
 * request modal is a client component, see the note in lib/db.ts.
 */
export const PAYOUT_FEE_PERCENT: Record<PayoutMethodType, number> = {
  BANK: 3,
  CRYPTO: 5,
};

/** Days of the month payouts are settled on. */
export const PAYOUT_DAYS = [1, 15];

export type PayoutRequestStatus = "PENDING" | "PAID" | "REJECTED" | "CANCELLED";

export const PAYOUT_STATUS_LABEL: Record<PayoutRequestStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export interface PayoutRequestView {
  id: string;
  requestNo: number;
  status: PayoutRequestStatus;
  /** null when the teammate asked for their full balance. */
  amountEUR: number | null;
  feePercent: number;
  note: string | null;
  adminNote: string | null;
  grossEUR: number | null;
  feeEUR: number | null;
  netEUR: number | null;
  methodType: PayoutMethodType;
  methodSummary: string;
  createdAt: number;
  processedAt: number | null;
}

/** Rounded to cents — the columns behind this are Decimal(10,2). */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface PayoutBreakdown {
  gross: number;
  fee: number;
  net: number;
}

export function payoutBreakdown(grossEUR: number, feePercent: number): PayoutBreakdown {
  const gross = roundCents(Math.max(0, grossEUR));
  const fee = roundCents((gross * feePercent) / 100);
  return { gross, fee, net: roundCents(gross - fee) };
}

/**
 * The next date a payout would actually be settled. Requests are collected
 * continuously but only paid on the 1st and the 15th, which is what makes
 * "full balance" resolve later than it was asked for.
 */
export function nextPayoutDate(from: Date = new Date()): Date {
  const year = from.getFullYear();
  const month = from.getMonth();
  const day = from.getDate();

  for (const target of PAYOUT_DAYS) {
    if (day < target) return new Date(year, month, target);
  }
  // Past the last payout day this month — roll into the next one. Passing
  // month + 1 with day 1 is safe across a December boundary.
  return new Date(year, month + 1, PAYOUT_DAYS[0]);
}
