-- Teammate earnings ledger + running balance.
--
-- The 50% cut itself is not migrated: existing orders keep whatever
-- teammatePayoutEUR they have (usually NULL, which used to mean "the full
-- price"). Only orders created from here on get the fixed half.

ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "balanceEUR" DECIMAL(10, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  CREATE TYPE "TeammateEarningType" AS ENUM ('ORDER_PAYOUT', 'PAYOUT_SENT', 'ADJUSTMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "TeammateEarning" (
  "id"         TEXT PRIMARY KEY,
  "teammateId" TEXT NOT NULL REFERENCES "Teammate"("id") ON DELETE CASCADE,
  "orderId"    TEXT REFERENCES "Order"("id"),
  "type"       "TeammateEarningType" NOT NULL DEFAULT 'ORDER_PAYOUT',
  "amountEUR"  DECIMAL(10, 2) NOT NULL,
  "note"       TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency guard for order payouts. NULLs are distinct in Postgres, so
-- this does not restrict ADJUSTMENT rows, which carry no orderId.
CREATE UNIQUE INDEX IF NOT EXISTS "TeammateEarning_teammateId_orderId_type_key"
  ON "TeammateEarning"("teammateId", "orderId", "type");

CREATE INDEX IF NOT EXISTS "TeammateEarning_teammateId_createdAt_idx"
  ON "TeammateEarning"("teammateId", "createdAt");
