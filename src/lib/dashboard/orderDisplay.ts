import type { OrderStatus } from "@/lib/matchmaking/types";

// Buckets the full OrderStatus union down to the 3 states the client
// dashboard actually distinguishes for history/stats purposes.
export type DisplayStatus = "upcoming" | "completed" | "cancelled";

// An order still waiting for its payment is grouped with the cancelled ones:
// no money has moved, so it must not count towards spend, and most of these
// are abandoned checkouts that the webhook cancels anyway.
const CANCELLED_STATUSES: OrderStatus[] = ["awaiting_payment", "cancelled", "cancel_pending", "no_match"];

export function displayStatus(status: OrderStatus): DisplayStatus {
  if (status === "completed") return "completed";
  if (CANCELLED_STATUSES.includes(status)) return "cancelled";
  return "upcoming";
}

export function formatOrderDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}
