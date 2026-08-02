import type { OrderStatus } from "@/lib/matchmaking/types";

// Buckets the full OrderStatus union down to the 3 states the client
// dashboard actually distinguishes for history/stats purposes.
export type DisplayStatus = "upcoming" | "completed" | "cancelled";

const CANCELLED_STATUSES: OrderStatus[] = ["cancelled", "cancel_pending", "no_match"];

export function displayStatus(status: OrderStatus): DisplayStatus {
  if (status === "completed") return "completed";
  if (CANCELLED_STATUSES.includes(status)) return "cancelled";
  return "upcoming";
}

export function formatOrderDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}
