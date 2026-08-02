"use client";

import { PayoutQueue } from "@/components/dashboard/admin/PayoutQueue";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { computePayoutQueue } from "@/lib/dashboard/adminMetrics";

export function AdminPayoutQueuePanel() {
  const payouts = computePayoutQueue(useAllOrders());
  return <PayoutQueue payouts={payouts} />;
}
