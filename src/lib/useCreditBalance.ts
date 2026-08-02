"use client";

import { useEffect, useState } from "react";

// Small polling-free fetch of the signed-in account's credit balance —
// used anywhere that needs to know "can this be paid with credits right
// now" (checkout, rebook/keep-playing) without duplicating the fetch
// CreditsWidget already does for the header pill.
export function useCreditBalance(enabled: boolean): { balanceCents: number | null; refresh: () => void } {
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/me/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { balanceCents: number } | null) => {
        if (!cancelled && data) setBalanceCents(data.balanceCents);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { balanceCents, refresh: () => setTick((t) => t + 1) };
}
