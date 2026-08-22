"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the server component tree on an interval, so views that show
 * someone else's live state (a teammate's online switch, an order's status)
 * update without an F5. Pauses while the tab is hidden — a background tab
 * doesn't need to keep hitting the database.
 */
// 60s rather than 5s: router.refresh() re-runs every Prisma query on the
// page, so an admin list left open no longer causes twelve full reads a minute
// a small connection pool. The visibility catch-up below means returning to
// the tab is still instant.
export function LiveRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);

    // Catch up immediately when the tab comes back rather than waiting out
    // the rest of the interval.
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
