import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// SERVER ONLY. Nothing reachable from a "use client" component may import a
// *value* from this file, or from any module that imports it — the adapter
// pulls in `pg`, which needs Node's `net`/`tls`/`dns` and fails the build with
// a module-not-found error that points at pg rather than at the real culprit.
//
// `import type` is fine (it's erased). If a client component needs a shape or
// a label that lives next to a query, split the pure part into its own module
// — see lib/earnings.ts alongside lib/teammateEarnings.ts.

// Prisma 7 requires a driver adapter for the SQL execution path — see
// .agents/skills/prisma-upgrade-v7/references/driver-adapters.md. Cached on
// globalThis so hot-reloading in dev doesn't open a fresh connection pool
// on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    // Fails loudly and clearly instead of a cryptic adapter crash — that
    // means DATABASE_URL isn't set wherever this code actually runs
    // (locally: .env; on the Hostinger deploy: the hosting panel's
    // environment variables — .env is gitignored and never gets deployed).
    throw new Error("DATABASE_URL is not set.");
  }
  // Which pooler we are actually on, read from the URL rather than assumed.
  //
  // This used to be a comment claiming port 6543 while DATABASE_URL sat on
  // 5432, and the two modes want opposite pool sizes:
  //
  // - 6543, transaction mode: the connection goes back to the pool between
  //   statements, so `max` is a throughput knob. Ten is generous.
  // - 5432, session mode: each client holds its connection for as long as it
  //   lives, so `max` is a hard reservation out of a project-wide ceiling.
  //   Ten per instance is how two processes become an outage.
  //
  // Deriving it means moving DATABASE_URL between the two is a config change
  // and not also a silent code bug.
  const transactionPooler = /:6543(\/|$|\?)/.test(process.env.DATABASE_URL);
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // A sleeping/unreachable pooler must fail quickly. Without these pg can
    // leave an auth request pending for a long time and the login UI appears
    // frozen on "Please wait…".
    connectionTimeoutMillis: 5_000,
    // The quiet live-view fallback runs once a minute. Closing an idle
    // connection after 30s guaranteed a fresh PgBouncer authentication on
    // almost every poll (tens of thousands of get_auth calls in Supabase).
    // Keep a small pool warm instead of constantly tearing it down.
    idleTimeoutMillis: transactionPooler ? 5 * 60_000 : 60_000,
    query_timeout: 8_000,
    statement_timeout: 8_000,
    // Every dashboard page is force-dynamic and runs several queries per
    // render, so too small a pool shows up as requests queueing behind each
    // other — but on the session pooler a large one is borrowed from every
    // other instance, and EMAXCONNSESSION is what that looks like.
    max: transactionPooler ? 5 : 3,
  });
  return new PrismaClient({ adapter });
}

// Built lazily behind a Proxy instead of at module load — Next.js imports
// every route module during the build's "collecting page data" step just
// to inspect it, with no guarantee DATABASE_URL is injected into that build
// container the same way it's injected at runtime. Constructing the client
// eagerly crashed the whole build the moment that env var was missing at
// build time, even though nothing was actually querying the database yet.
// This way the connection is only ever attempted the first time a route
// handler actually touches `prisma.*`, i.e. at real request time.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  },
});
