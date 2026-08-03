"use client";

import type { DispatchOrder } from "@/lib/matchmaking/types";

// Checkout's entry point into the real dispatcher. The old client-side
// createOrder() picked candidates in the browser; who gets invited is a
// server decision now (see lib/dispatch/create.ts).
export async function placeOrder(input: {
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  teammates: number;
  requestedTeammateId: string | null;
  customerLabel: string;
  isReplay?: boolean;
}): Promise<DispatchOrder | null> {
  try {
    const res = await fetch("/api/dispatch/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.order ?? null;
  } catch {
    return null;
  }
}

// "Keep playing with the same teammate" — same game and option, dispatched
// straight back to whoever just played it instead of the open pool.
export async function placeReplayOrder(order: DispatchOrder): Promise<DispatchOrder | null> {
  if (!order.selectedTeammateId) return null;
  return placeOrder({
    gameSlug: order.gameSlug,
    gameName: order.gameName,
    option: order.option,
    priceEUR: order.priceEUR,
    teammates: order.teammates,
    requestedTeammateId: order.selectedTeammateId,
    customerLabel: order.customerLabel,
    isReplay: true,
  });
}
