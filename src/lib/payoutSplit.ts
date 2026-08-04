/**
 * The teammate's fixed share of an order's price. One constant, because the
 * number shows up in three places that must never drift apart: what an order
 * stores at creation, what the session panel promises the teammate, and what
 * actually gets credited when the order completes.
 */
export const TEAMMATE_PAYOUT_RATE = 0.5;

/** Rounded to cents — a Decimal(10,2) column can't hold anything finer. */
export function teammateCut(priceEUR: number): number {
  return Math.round(priceEUR * TEAMMATE_PAYOUT_RATE * 100) / 100;
}

/**
 * The teammate-facing payout for an order. Orders created before the fixed
 * split have no stored value; they fall back to the rate rather than to the
 * full price, which is what the old `?? priceEUR` fallback wrongly implied.
 */
export function payoutForOrder(order: { priceEUR: unknown; teammatePayoutEUR: unknown }): number {
  if (order.teammatePayoutEUR !== null && order.teammatePayoutEUR !== undefined) {
    return Number(order.teammatePayoutEUR);
  }
  return teammateCut(Number(order.priceEUR));
}
