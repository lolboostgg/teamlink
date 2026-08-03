"use client";

import { useEffect, useState } from "react";
import { listActiveOrders, subscribeToDispatch, respondToCandidate } from "@/lib/matchmaking/store";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { useIsAvailable } from "@/lib/availability";
import { deriveTeammateState, canRespondToDispatch, type TeammateDispatchState } from "@/lib/matchmaking/teammateState";

/**
 * Single source of truth for the teammate dashboard: the derived phase plus
 * the only mutation the dashboard is allowed to make on it. Ticks every
 * 500ms so countdowns stay smooth, and rides the cross-tab broadcast so a
 * dispatch shows up without a reload.
 */
export function useTeammateDispatchState(): TeammateDispatchState & {
  respond: (accept: boolean) => void;
  online: boolean;
} {
  const teammateId = useCurrentTeammateId();
  const online = useIsAvailable();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<TeammateDispatchState>(() =>
    deriveTeammateState([], null, false),
  );

  useEffect(() => {
    function refresh() {
      setState(deriveTeammateState(listActiveOrders(), teammateId, online));
    }
    refresh();
    const unsubscribe = subscribeToDispatch(refresh);
    const interval = setInterval(refresh, 500);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [teammateId, online, tick]);

  return {
    ...state,
    online,
    respond: (accept: boolean) => {
      if (!teammateId || !state.order || !canRespondToDispatch(state)) return;
      respondToCandidate(state.order.id, teammateId, accept);
      setTick((t) => t + 1);
    },
  };
}
