"use client";

import { useEffect, useRef } from "react";

const MAX_BACKOFF_MS = 60_000;

/**
 * The one polling loop every live view in the dashboard shares.
 *
 * Three things it does that a bare `setInterval` doesn't:
 *
 * - **Pauses in a hidden tab.** A dashboard left open in a background tab used
 *   to keep hitting the API forever; now it goes quiet and catches up the
 *   moment the tab is focused again.
 * - **Backs off on failure.** Each consecutive error doubles the delay (capped
 *   at a minute), so an API outage doesn't turn every open dashboard into a
 *   retry storm. One success resets it.
 * - **Never overlaps.** The next run is scheduled after the previous one
 *   settles, instead of firing on a fixed clock into a slow request.
 *
 * `task` is read through a ref, so an inline arrow closing over fresh state is
 * fine — it will not restart the timer.
 */
export function usePoll(task: () => void | Promise<unknown>, intervalMs: number, enabled = true) {
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule(delayMs: number) {
      if (cancelled) return;
      timer = setTimeout(run, Math.min(delayMs, MAX_BACKOFF_MS));
    }

    async function run() {
      if (cancelled) return;
      if (document.visibilityState !== "visible") {
        // Stay parked; `onVisibility` wakes us the instant the tab is back.
        schedule(intervalMs);
        return;
      }
      try {
        await taskRef.current();
        failures = 0;
      } catch {
        failures = Math.min(failures + 1, 5);
      }
      schedule(intervalMs * 2 ** failures);
    }

    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      failures = 0;
      run();
    }

    run();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
