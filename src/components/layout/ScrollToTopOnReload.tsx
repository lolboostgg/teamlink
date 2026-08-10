"use client";

import { useLayoutEffect } from "react";

/**
 * Browsers normally restore the previous scroll position after a reload.
 * For this site a reload is treated as a fresh visit, while back/forward and
 * normal Next.js navigation keep their native scroll behaviour.
 */
export function ScrollToTopOnReload() {
  useLayoutEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== "reload") return;

    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";

    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    reset();
    const frame = window.requestAnimationFrame(reset);
    window.addEventListener("pageshow", reset, { once: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", reset);
      history.scrollRestoration = previousRestoration;
    };
  }, []);

  return null;
}
