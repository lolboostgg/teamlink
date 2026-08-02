import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 requires a driver adapter for the SQL execution path — see
// .agents/skills/prisma-upgrade-v7/references/driver-adapters.md. Cached on
// globalThis so hot-reloading in dev doesn't open a fresh connection pool
// on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    // Fails loudly and clearly instead of a cryptic "Cannot read properties
    // of undefined (reading 'prepareCacheLength')" from the adapter — that
    // crash means exactly this: DATABASE_URL isn't set wherever this code
    // actually runs (e.g. the Hostinger deploy env, not just local .env).
    throw new Error(
      "DATABASE_URL is not set. Add it as an environment variable wherever this app runs (locally: .env; on the Hostinger deploy: the hosting panel's environment variables — .env is gitignored and never gets deployed).",
    );
  }
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
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
