-- Wave dispatch + dispatch log.
--
-- Run the first statement ON ITS OWN. Postgres will not add a value to an
-- enum inside a transaction block that later uses it, and the Supabase SQL
-- editor wraps a multi-statement run in one transaction — so pasting the
-- whole file at once fails on the very last query with "unsafe use of new
-- value SUPERSEDED". Run part 1, then part 2.

-- ── Part 1 ──────────────────────────────────────────────────────────────
ALTER TYPE "CandidateStatus" ADD VALUE IF NOT EXISTS 'SUPERSEDED';

-- ── Part 2 ──────────────────────────────────────────────────────────────
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "dispatchWave"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "waveDeadline"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "poolExhaustedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "matchingPaused"  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DispatchCandidate"
  ADD COLUMN IF NOT EXISTS "wave"        INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

ALTER TABLE "Teammate"
  ADD COLUMN IF NOT EXISTS "regions"      JSONB,
  ADD COLUMN IF NOT EXISTS "maxRankSelf"  TEXT,
  ADD COLUMN IF NOT EXISTS "maxRankAdmin" TEXT;

CREATE TABLE IF NOT EXISTS "DispatchEvent" (
  "id"         TEXT NOT NULL,
  "orderId"    TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "teammateId" TEXT,
  "message"    TEXT NOT NULL,
  "detail"     JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DispatchEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DispatchEvent_orderId_createdAt_idx"
  ON "DispatchEvent" ("orderId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DispatchEvent_orderId_fkey'
  ) THEN
    ALTER TABLE "DispatchEvent"
      ADD CONSTRAINT "DispatchEvent_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Orders already searching under the old single-wave dispatcher are on wave 1
-- by definition; without this they would look like they had never been
-- dispatched and the first tick would send a duplicate wave.
UPDATE "Order"
   SET "dispatchWave" = 1
 WHERE "dispatchWave" = 0
   AND "dispatchedAt" IS NOT NULL;
