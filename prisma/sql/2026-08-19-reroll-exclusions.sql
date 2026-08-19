-- Teammates a reroll has already turned down, carried from the order it
-- replaces onto its replacement. Nullable with no backfill: an order that
-- predates rerolling has nobody to exclude, and the dispatcher reads a
-- missing value as the empty list.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "excludedTeammateIds" JSONB;
