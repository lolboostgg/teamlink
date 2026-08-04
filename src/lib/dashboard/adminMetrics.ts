import type { DispatchOrder } from "@/lib/matchmaking/types";

const FAILED_STATUSES: DispatchOrder["status"][] = ["cancelled", "no_match"];
const TERMINAL_STATUSES: DispatchOrder["status"][] = ["completed", "cancelled", "no_match"];

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

