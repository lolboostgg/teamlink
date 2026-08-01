"use client";

import { usePathname } from "next/navigation";
import { recordPathname } from "@/lib/routeHistory";

// Deliberately calls recordPathname during render, not in an effect —
// module state updated here is guaranteed settled before any other
// component's effects run for this same navigation (React finishes
// rendering the whole tree first). This module-level history also resets
// on a real page load (fresh JS module), which is exactly what we want:
// Hero's "did I arrive from /games" check should only ever be true for an
// actual in-app navigation, never a reload or direct visit.
export function RouteTracker() {
  const pathname = usePathname();
  recordPathname(pathname);
  return null;
}
