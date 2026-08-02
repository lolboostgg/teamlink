import { TEAMMATES } from "@/lib/teammates";
import type { DispatchOrder } from "@/lib/matchmaking/types";

const FAILED_STATUSES: DispatchOrder["status"][] = ["cancelled", "no_match"];
const TERMINAL_STATUSES: DispatchOrder["status"][] = ["completed", "cancelled", "no_match"];

function shareOf(order: DispatchOrder): number {
  return order.priceEUR / Math.max(1, order.teammates);
}

export interface AdminStats {
  gmvEUR: number;
  activeBookings: number;
  totalOrders: number;
  completedSessions: number;
}

// Everything here is derived from the real dispatch order history for this
// browser — there's no server, so this is scoped to whatever's actually
// been booked in this session/localStorage, not a platform-wide figure.
export function computeAdminStats(orders: DispatchOrder[]): AdminStats {
  const gmvEUR = orders.filter((o) => !FAILED_STATUSES.includes(o.status)).reduce((sum, o) => sum + o.priceEUR, 0);
  return {
    gmvEUR,
    activeBookings: orders.filter((o) => !TERMINAL_STATUSES.includes(o.status)).length,
    totalOrders: orders.length,
    completedSessions: orders.filter((o) => o.status === "completed").length,
  };
}

export interface PayoutRow {
  teammateId: string;
  teammateName: string;
  amountEUR: number;
  sessionsCount: number;
}

const NAME_BY_ID = new Map(TEAMMATES.map((t) => [t.id, t.name]));

// Real per-teammate earnings from completed sessions (split evenly across
// the order's group size — see shareOf(), same rule the teammate dashboard
// uses). No payment backend exists, so there's no real "paid" vs "pending"
// distinction — every row is money actually earned and still owed.
export function computePayoutQueue(orders: DispatchOrder[]): PayoutRow[] {
  const totals = new Map<string, { amountEUR: number; sessionsCount: number }>();
  for (const order of orders) {
    if (order.status !== "completed") continue;
    const share = shareOf(order);
    for (const teammateId of order.selectedTeammateIds) {
      const entry = totals.get(teammateId) ?? { amountEUR: 0, sessionsCount: 0 };
      entry.amountEUR += share;
      entry.sessionsCount += 1;
      totals.set(teammateId, entry);
    }
  }
  return Array.from(totals.entries())
    .map(([teammateId, { amountEUR, sessionsCount }]) => ({
      teammateId,
      teammateName: NAME_BY_ID.get(teammateId) ?? teammateId,
      amountEUR,
      sessionsCount,
    }))
    .sort((a, b) => b.amountEUR - a.amountEUR);
}
