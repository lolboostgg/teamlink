-- Ties a store-credit movement to the order behind it.
--
-- Cancelling a paid order gives the money back, and for an account that
-- means crediting the balance. A cancellation that arrives twice -- a
-- double-clicked button, two open tabs, a teammate and an admin resolving
-- the same order -- must not credit it twice, and nothing here made that
-- answerable: the ledger carried a free-text note and no order reference, so
-- "was this order already refunded?" could not be asked.
--
-- Same shape TeammateEarning already uses on the payout side. Postgres treats
-- NULLs as distinct, so topups, bonuses and manual adjustments (orderId null)
-- are untouched by the constraint and stay repeatable.

ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "orderId" TEXT;

ALTER TABLE "CreditTransaction"
  DROP CONSTRAINT IF EXISTS "CreditTransaction_orderId_fkey";

-- SET NULL rather than CASCADE: an order that is deleted must not take the
-- customer's balance history with it. The row is what explains a number they
-- can see.
ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "CreditTransaction_userId_orderId_type_key"
  ON "CreditTransaction"("userId", "orderId", "type");

CREATE INDEX IF NOT EXISTS "CreditTransaction_orderId_idx"
  ON "CreditTransaction"("orderId");
