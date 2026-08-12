import { prisma } from "@/lib/db";

let ready: Promise<void> | null = null;

/**
 * Keeps the small checkout compatibility migration attached to the code path
 * that needs it. Some managed Node hosts launch Next directly and therefore
 * skip npm's `prestart` hook; relying on that hook left new application code
 * running against the previous schema.
 *
 * The advisory transaction lock prevents two freshly started instances from
 * racing the DDL. Every statement is idempotent, so restarts remain cheap.
 */
export function ensureCheckoutSchema(): Promise<void> {
  if (ready) return ready;

  ready = prisma
    .$transaction(async (tx) => {
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(725067103)");
      await tx.$executeRawUnsafe(
        'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "unitPriceEUR" DECIMAL(10, 2)',
      );
      await tx.$executeRawUnsafe(
        'UPDATE "Order" SET "unitPriceEUR" = ROUND("priceEUR" / GREATEST("gamesBooked", 1), 2) WHERE "unitPriceEUR" IS NULL',
      );
      await tx.$executeRawUnsafe('ALTER TABLE "Order" ALTER COLUMN "unitPriceEUR" SET NOT NULL');
      await tx.$executeRawUnsafe('ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT');
      await tx.$executeRawUnsafe(
        'CREATE UNIQUE INDEX IF NOT EXISTS "Charge_idempotencyKey_key" ON "Charge"("idempotencyKey")',
      );
    })
    .then(() => undefined)
    .catch((error) => {
      // A failed attempt must be retryable after credentials/permissions are
      // corrected; caching the rejection would break this instance forever.
      ready = null;
      throw error;
    });

  return ready;
}
