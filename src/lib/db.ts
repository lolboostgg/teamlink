import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 requires a driver adapter for the SQL execution path — see
// .agents/skills/prisma-upgrade-v7/references/driver-adapters.md. Cached on
// globalThis so hot-reloading in dev doesn't open a fresh connection pool
// on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
  // Fails loudly and clearly instead of a cryptic "Cannot read properties
  // of undefined (reading 'prepareCacheLength')" from the adapter — that
  // crash means exactly this: DATABASE_URL isn't set wherever this build
  // is running (e.g. the Hostinger deploy env, not just local .env).
  throw new Error(
    "DATABASE_URL is not set. Add it as an environment variable wherever this app runs (locally: .env; on the Hostinger deploy: the hosting panel's environment variables — .env is gitignored and never gets deployed).",
  );
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
