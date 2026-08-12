import { EventEmitter } from "node:events";
import { Client } from "pg";

/**
 * The change-notification bus behind the SSE endpoint.
 *
 * Two layers, because either alone is not enough:
 *
 * - An in-process `EventEmitter`, which delivers to every SSE stream held by
 *   *this* Node process. Always present, needs no infrastructure.
 * - Postgres `LISTEN/NOTIFY`, so a write served by one instance also reaches
 *   streams held by another. DATABASE_URL points at port 5432 (a session
 *   connection), which supports it — a transaction-mode pooler would not, and
 *   if the LISTEN connection can't be opened we degrade to local-only
 *   delivery rather than failing the request that published.
 *
 * Payloads are deliberately tiny: an event says *what changed for whom*, not
 * what the new value is. Clients re-fetch through their existing endpoints,
 * which keeps authorization in exactly one place.
 */

/**
 * Both ends of LISTEN/NOTIFY have to name the same channel, so instances
 * running either side of a rename don't hear each other: during the rollout
 * that changes this string, cross-instance delivery falls back to local-only
 * until the last old instance is gone. Harmless — the polling fallback in
 * useLiveSync covers exactly this — but it is why the name is a constant and
 * not spelled out at both call sites.
 */
export const PG_CHANNEL = "qup_events";

export type EventTopic = "orders" | "notifications" | "chat" | "dispatch";

export interface LiveEvent {
  topic: EventTopic;
  /** Users who should receive it. Empty means "every admin". */
  userIds?: string[];
  /** Extra scope within a topic, e.g. a conversation key for chat. */
  key?: string;
  /** Set for events every connected client should see. */
  broadcast?: boolean;
}

type Bus = {
  emitter: EventEmitter;
  listener?: Client;
  listenerStarting?: Promise<void>;
  publisher?: Client;
};

const globalForBus = globalThis as unknown as { qupBus?: Bus };

function bus(): Bus {
  if (!globalForBus.qupBus) {
    const emitter = new EventEmitter();
    // One process can hold many concurrent SSE streams; the default cap of 10
    // would log a spurious leak warning well before that is a real problem.
    emitter.setMaxListeners(0);
    globalForBus.qupBus = { emitter };
  }
  return globalForBus.qupBus;
}

function dispatchLocally(event: LiveEvent) {
  bus().emitter.emit("event", event);
}

/**
 * Which database URL the bus connects on.
 *
 * Not necessarily the one Prisma uses. LISTEN/NOTIFY needs a session that
 * stays put — a transaction-mode pooler hands the connection back between
 * statements, so a LISTEN registered on it is silently dropped and
 * cross-instance delivery degrades to "same process only" with no error to
 * notice it by. That is exactly the pooler Prisma should be on, though, since
 * it is what absorbs a Next.js app's many short-lived queries.
 *
 * So the two have to differ, and on Supabase they differ by one digit: the
 * same host serves transaction mode on 6543 and session mode on 5432. That is
 * derived here rather than demanded as configuration — EVENTS_DATABASE_URL is
 * a name this codebase invented, not something the database hands you, and a
 * setup step nobody is told about is a setup step nobody performs.
 *
 * Set EVENTS_DATABASE_URL explicitly to override, which is what a non-Supabase
 * host or a direct (non-pooled) connection needs.
 */
function busConnectionString(): string | undefined {
  const explicit = process.env.EVENTS_DATABASE_URL;
  if (explicit) return explicit;

  const url = process.env.DATABASE_URL;
  if (!url || !/:6543(\/|\?|$)/.test(url)) return url;

  // Only for the host where the port really does select the mode. Rewritten
  // by hand rather than through new URL(), which re-encodes the password on
  // the way out and can hand pg a string that no longer authenticates.
  if (!/@[^/]*\.pooler\.supabase\.com[:/]/.test(url)) {
    console.warn(
      "[events] DATABASE_URL is on port 6543, which drops LISTEN, and this host is not one " +
        "whose session port can be guessed. Cross-instance delivery is off until " +
        "EVENTS_DATABASE_URL points at a session-mode connection.",
    );
    return url;
  }

  return url
    .replace(/:6543(\/|\?|$)/, ":5432$1")
    // A transaction-pooler flag; meaningless on the session port, and pg has
    // no reason to be handed it.
    .replace(/([?&])pgbouncer=true&?/, (_m, sep) => (sep === "?" ? "?" : "&"))
    .replace(/[?&]$/, "");
}

/**
 * Opens the dedicated LISTEN connection. Kept separate from the Prisma pool:
 * a listening connection is held open for the lifetime of the process and
 * must never be handed back to a pool between queries.
 */
async function ensureListener(): Promise<void> {
  const current = bus();
  if (current.listener) return;
  if (current.listenerStarting) return current.listenerStarting;
  if (!busConnectionString()) return;

  current.listenerStarting = (async () => {
    const client = new Client({
      connectionString: busConnectionString(),
      connectionTimeoutMillis: 2_000,
      query_timeout: 2_000,
    });
    client.on("notification", (message) => {
      if (message.channel !== PG_CHANNEL || !message.payload) return;
      try {
        dispatchLocally(JSON.parse(message.payload) as LiveEvent);
      } catch {
        // A malformed payload is not worth tearing the connection down for.
      }
    });
    client.on("error", () => {
      // Drop the handle so the next subscriber reconnects. Local delivery
      // keeps working in the meantime.
      const state = bus();
      if (state.listener === client) state.listener = undefined;
      client.end().catch(() => undefined);
    });
    await client.connect();
    await client.query(`LISTEN "${PG_CHANNEL}"`);
    bus().listener = client;
  })()
    .catch(() => {
      // No cross-instance fan-out available — in-process delivery still works.
    })
    .finally(() => {
      bus().listenerStarting = undefined;
    });

  return current.listenerStarting;
}

/**
 * Announces a change. Safe to call from anywhere on the server, including
 * inside a request that is about to return — it never throws, because failing
 * to notify must not fail the write that succeeded.
 */
let publishQueue: Promise<void> = Promise.resolve();

async function publishAcrossInstances(event: LiveEvent): Promise<void> {
  if (!busConnectionString()) return;
  try {
    const current = bus();
    if (!current.publisher) {
      const client = new Client({
        connectionString: busConnectionString(),
        connectionTimeoutMillis: 2_000,
        query_timeout: 2_000,
      });
      client.on("error", () => {
        const state = bus();
        if (state.publisher === client) state.publisher = undefined;
      });
      await client.connect();
      current.publisher = client;
    }
    await current.publisher.query("SELECT pg_notify($1, $2)", [PG_CHANNEL, JSON.stringify(event)]);
  } catch {
    // Local subscribers already got it; polling catches another instance up.
  }
}

export async function publish(event: LiveEvent): Promise<void> {
  dispatchLocally(event);
  // Cross-instance fan-out is a delivery optimisation, not part of the
  // database mutation the user is waiting for. Queue it in the background so
  // three signals from one click cannot add three connection timeouts to the
  // response. Same-instance SSE is already updated synchronously above; the
  // polling fallback covers a process that is frozen before this finishes.
  publishQueue = publishQueue.then(() => publishAcrossInstances(event));
}

/** Subscribes to every event on this process. Returns an unsubscribe fn. */
export function subscribe(handler: (event: LiveEvent) => void): () => void {
  void ensureListener();
  bus().emitter.on("event", handler);
  return () => bus().emitter.off("event", handler);
}

/** Whether an event is meant for this viewer. */
export function isForViewer(event: LiveEvent, userId: string, isAdmin: boolean): boolean {
  if (event.broadcast) return true;
  if (!event.userIds || event.userIds.length === 0) return isAdmin;
  return event.userIds.includes(userId);
}
