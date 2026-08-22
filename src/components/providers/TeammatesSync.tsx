"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { setTeammatesCache, type Teammate } from "@/lib/teammates";

// Not a Context — deliberately a side-effect-only component. The rest of
// the app already reads the roster synchronously mid-render via
// getTeammateById()/TEAMMATES (see lib/teammates.ts), so instead of
// threading a loading state through every one of those call sites, this
// just fetches once on mount and overwrites the shared array's contents in
// place. Profile edits are low-frequency compared to order/session state,
// so a plain refetch (not a live subscription) is enough — an admin or
// teammate saving a profile change sees it immediately on their own
// server-rendered dashboard page; other already-open tabs pick it up on
// their next load.
export function TeammatesSync() {
  const { status } = useSession();

  useEffect(() => {
    // Public pages already have the static roster as their resilient default.
    // Avoid waking the database for every anonymous landing-page visit; live
    // availability has its own narrowly scoped endpoint in LiveTeammates.
    if (status !== "authenticated") return;

    let cancelled = false;
    fetch("/api/teammates")
      .then((res) => (res.ok ? res.json() : null))
      .then((list: Teammate[] | null) => {
        if (!cancelled && list) setTeammatesCache(list);
      })
      .catch(() => {
        // Offline/DB hiccup — the static seed array already in
        // TEAMMATES stays as a safe fallback, no user-facing error needed.
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
