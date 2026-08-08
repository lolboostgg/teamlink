"use client";

/**
 * Tells the server an alert actually made it onto this teammate's screen.
 *
 * Fire-and-forget on purpose: it decides nothing about the order, only
 * whether a later non-response may be held against them. A failed
 * confirmation should never get in the way of accepting.
 */
export function ackDispatchAlert(orderId: string): void {
  void fetch("/api/dispatch/ack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
    keepalive: true,
  }).catch(() => {
    // The absence of a confirmation is itself the signal — see the route.
  });
}
