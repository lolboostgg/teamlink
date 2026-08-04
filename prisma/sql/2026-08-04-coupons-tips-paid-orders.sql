-- Coupons and tips move out of the browser, and an order now waits for its
-- payment before anyone is invited to it.

-- Placed, but nobody has been invited yet because the money hasn't arrived.
-- Stripe's webhook is what moves it on (activateOrderAfterPayment).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';

-- Buying store credit is a real payment now, so it needs its own charge kind.
ALTER TYPE "ChargeKind" ADD VALUE IF NOT EXISTS 'CREDITS';

-- A tip is credited to the teammate through the same ledger their session
-- payouts run through.
ALTER TYPE "TeammateEarningType" ADD VALUE IF NOT EXISTS 'TIP';

-- Claimed by whoever first hands out what a charge bought. The action that
-- took the money and the webhook that confirms it race for this, so games are
-- added — or a tip credited — exactly once.
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);

-- Was localStorage: a code only existed in the browser that earned it, and
-- clearing site data handed it back. Ownership and redemption are rows now.
CREATE TABLE IF NOT EXISTS "Coupon" (
  "id"              TEXT PRIMARY KEY,
  "code"            TEXT NOT NULL,
  "discountPercent" INTEGER NOT NULL,
  "source"          TEXT NOT NULL,
  "ownerUserId"     TEXT REFERENCES "User"("id") ON DELETE CASCADE,
  "usedAt"          TIMESTAMP(3),
  "usedOnOrderId"   TEXT REFERENCES "Order"("id"),
  "expiresAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The unique code plus the "usedAt IS NULL" filter on redemption is what
-- stops two checkouts spending the same coupon.
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_ownerUserId_usedAt_idx" ON "Coupon"("ownerUserId", "usedAt");

-- One tip per order: the unique orderId is what makes a redelivered webhook
-- or a double-clicked button a no-op instead of a second payout.
CREATE TABLE IF NOT EXISTS "Tip" (
  "id"         TEXT PRIMARY KEY,
  "orderId"    TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "teammateId" TEXT NOT NULL REFERENCES "Teammate"("id"),
  "fromUserId" TEXT REFERENCES "User"("id"),
  "amountEUR"  DECIMAL(10, 2) NOT NULL,
  "chargeId"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tip_orderId_key" ON "Tip"("orderId");
CREATE INDEX IF NOT EXISTS "Tip_teammateId_createdAt_idx" ON "Tip"("teammateId", "createdAt");
