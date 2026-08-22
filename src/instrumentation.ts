/**
 * Runs once when a server instance boots, before it accepts requests.
 *
 * Every deploy restarts the process, and a fresh process has done none of the
 * work that makes the app quick: no database pool, no compiled route modules.
 * Measured on this build, the first request to a route took 1.4-1.5s against
 * 19-51ms once warm — a factor of 45 to 77 — and the first query paid 263ms
 * to open a connection that costs 34ms warm. Someone had to pay that, and it
 * was whoever happened to arrive first after a publish. This makes it the
 * server's own problem instead.
 *
 * Everything is done over HTTP against this same server, and nothing from the
 * application is imported here. That is not squeamishness: this file is traced
 * into the Edge instrumentation bundle as well as the Node one, so importing
 * lib/db pulls Prisma's client into a runtime that cannot load it and fails
 * the build — a runtime guard does not help, because the failure is at bundle
 * time, not at call time. Requesting a route that queries is a warm pool
 * anyway, so there is nothing the direct import would have bought.
 */
export function register() {
  // Only the Node server serves these routes.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Before anything else, and in dev too: this is the one that decides
  // whether a mistake is a broken request or a broken site.
  guardAgainstUnhandledRejections();

  announceBoot();

  // Dev restarts constantly and serves one person, who would rather have the
  // reload back than a warm pool.
  if (process.env.NODE_ENV !== "production") return;

  scheduleRouteWarmup();
}

/**
 * One line per booting process, with its pid.
 *
 * The host's log is a single file that every instance writes into, and
 * Next's own startup banner carries nothing to tell them apart — so a
 * banner appearing twice within a couple of milliseconds reads either as
 * one process logging twice or as two processes starting, and those want
 * opposite fixes. The pid settles it at a glance.
 *
 * The working directory comes along because it is hbuilds/versions/<id>/
 * nodejs on this host, which answers the other half of the question for
 * free: whether the process logging this is even the deploy just published.
 */
function announceBoot(): void {
  console.log(`[boot] pid ${process.pid} · node ${process.version} · ${process.cwd()}`);
}

/**
 * Stops one stray promise from taking the whole server with it.
 *
 * Node ends the process on an unhandled rejection, and on a server that is
 * the wrong trade every time: one request's mistake becomes everybody's
 * outage. Worse, it is silent — preload-timestamp.js installs an
 * uncaughtExceptionMonitor, and that does not fire for rejections, so the
 * log shows a restart with nothing above it and no way to tell what died.
 * Registering a listener is also what disarms the exit, so this both keeps
 * the server up and leaves the evidence behind.
 *
 * Not a licence to leave promises unhandled. Everything that reaches here is
 * a bug; the point is that it is reported as one instead of being paid for by
 * every customer with a session open.
 */
function guardAgainstUnhandledRejections(): void {
  // The dev server installs its own and would end up with two.
  if (process.listenerCount("unhandledRejection") > 0) return;

  process.on("unhandledRejection", (reason) => {
    const detail = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
    console.error("[unhandledRejection] a promise rejected with nobody listening:", detail);
  });
}

/**
 * The routes worth compiling before somebody asks for them.
 *
 * The entry points and the endpoints every open dashboard polls — not every
 * route in the app, which would trade a slow first visit for a slow boot.
 * Unauthenticated hits are enough: compiling the module is the expensive part,
 * and it happens whether or not the request goes on to find a session.
 */
const WARM_PATHS = [
  // First, and a database route on purpose: opening the connection pool is
  // its own 263ms against 34ms warm, and this is what pays it.
  "/api/community",
  "/",
  "/games",
  "/checkout",
  "/api/fx",
  "/api/dispatch/orders",
  "/api/dispatch/state",
  "/api/notifications",
  "/dashboard/client",
  "/dashboard/teammate",
];

/**
 * Fires the warmup after `register` returns.
 *
 * Not awaited and not part of readiness: `register` blocks the server from
 * accepting requests, so warming routes from inside it would deadlock — the
 * requests would be waiting for the server that is waiting for them. A short
 * delay puts them just behind the door opening, where they compete with real
 * traffic for a second or two and then stop.
 */
function scheduleRouteWarmup(): void {
  const port = process.env.PORT ?? "3000";
  const base = `http://127.0.0.1:${port}`;

  setTimeout(() => {
    void Promise.allSettled(
      WARM_PATHS.map((path) =>
        fetch(`${base}${path}`, {
          headers: { "user-agent": "qup-warmup" },
          signal: AbortSignal.timeout(10_000),
        }).catch(() => undefined),
      ),
    );
  }, 500).unref?.();
}
