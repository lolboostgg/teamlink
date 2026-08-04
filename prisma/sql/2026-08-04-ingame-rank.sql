-- The customer's own rank, asked with their IGN.

ALTER TABLE "GameAccount" ADD COLUMN IF NOT EXISTS "rank" TEXT;
ALTER TABLE "GameAccount" ADD COLUMN IF NOT EXISTS "division" TEXT;

-- Snapshotted onto the order for the same reason as the IGN: editing the
-- saved account later must not rewrite what a past order was booked at.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "ignRank" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "ignDivision" TEXT;
