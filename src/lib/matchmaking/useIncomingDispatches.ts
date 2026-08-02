"use client";

import { useEffect, useState } from "react";
import {
  DISPATCH_WINDOW_MS,
  listActiveOrders,
  respondToCandidate,
  startOrder,
  completeOrder,
  subscribeToDispatch,
} from "@/lib/matchmaking/store";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import type { DispatchOrder } from "@/lib/matchmaking/types";
import { useToast } from "@/components/ui/ToastProvider";

// Teammate-side view, scoped to whichever real teammate is signed in (see
// useCurrentTeammateId). Pending invites are orders where they're a
// candidate still awaiting a response; active orders are ones assigned to
// them that are in progress or ready to start. Returns empty lists while
// the identity is still resolving or for a non-teammate account.
export function useIncomingDispatches() {
  const { showToast } = useToast();
  const teammateId = useCurrentTeammateId();
  const [orders, setOrders] = useState<DispatchOrder[]>(() => listActiveOrders());

  useEffect(() => {
    function refresh() {
      setOrders(listActiveOrders());
    }
    refresh();
    const unsubscribe = subscribeToDispatch(refresh);
    const interval = setInterval(refresh, 1000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const pendingInvites = teammateId
    ? orders.filter((o) => o.candidates.some((c) => c.teammateId === teammateId && c.status === "pending"))
    : [];

  const activeOrders = teammateId
    ? orders.filter(
        (o) => o.selectedTeammateIds.includes(teammateId) && (o.status === "assigned" || o.status === "in_progress"),
      )
    : [];

  return {
    teammateId,
    pendingInvites,
    activeOrders,
    dispatchWindowMs: DISPATCH_WINDOW_MS,
    respond: (orderId: string, accept: boolean) => {
      if (!teammateId) return;
      const updated = respondToCandidate(orderId, teammateId, accept);
      if (updated) {
        setOrders(listActiveOrders());
        showToast(accept ? "Request accepted" : "Request declined", accept ? "success" : "info");
      } else {
        showToast("Couldn't respond, the request may have expired", "error");
      }
    },
    start: (orderId: string) => {
      startOrder(orderId);
      setOrders(listActiveOrders());
      showToast("Order started", "success");
    },
    complete: (orderId: string) => {
      completeOrder(orderId);
      setOrders(listActiveOrders());
      showToast("Order completed", "success");
    },
  };
}
