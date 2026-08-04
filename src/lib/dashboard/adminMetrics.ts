import type { DispatchOrder } from "@/lib/matchmaking/types";

// "awaiting_payment" sits with the failures: it is an order nobody paid for
// yet, so it must not show up as revenue or as an active booking.
const FAILED_STATUSES: DispatchOrder["status"][] = ["awaiting_payment", "cancelled", "no_match"];
const TERMINAL_STATUSES: DispatchOrder["status"][] = ["awaiting_payment", "completed", "cancelled", "no_match"];

export interface AdminStats {
  gmvEUR: number;
  activeBookings: number;
  totalOrders: number;
  completedSessions: number;
}

// Derived from the order history the dashboard loaded.
export function computeAdminStats(orders: DispatchOrder[]): AdminStats {
  const gmvEUR = orders.filter((o) => !FAILED_STATUSES.includes(o.status)).reduce((sum, o) => sum + o.priceEUR, 0);
  return {
    gmvEUR,
    activeBookings: orders.filter((o) => !TERMINAL_STATUSES.includes(o.status)).length,
    totalOrders: orders.length,
    completedSessions: orders.filter((o) => o.status === "completed").length,
  };
}

