-- Stripe customers, saved cards, charges, and the customer's in-game identity.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- The in-game identity the order was actually booked with, frozen on the
-- order so editing the saved account later cannot rewrite past orders.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "ign" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "ignRegion" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "ignRoles" JSONB;

DO $$
BEGIN
  CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "ChargeKind" AS ENUM ('ORDER', 'EXTRA_GAMES', 'TIP');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- Card numbers never land here: only Stripe's payment-method id and the
-- crumbs needed to show "Visa ending 4242".
CREATE TABLE IF NOT EXISTS "SavedCard" (
  "id"                    TEXT PRIMARY KEY,
  "userId"                TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "stripePaymentMethodId" TEXT NOT NULL,
  "brand"                 TEXT NOT NULL,
  "last4"                 TEXT NOT NULL,
  "expMonth"              INTEGER NOT NULL,
  "expYear"               INTEGER NOT NULL,
  "isDefault"             BOOLEAN NOT NULL DEFAULT false,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SavedCard_stripePaymentMethodId_key" ON "SavedCard"("stripePaymentMethodId");
CREATE INDEX IF NOT EXISTS "SavedCard_userId_idx" ON "SavedCard"("userId");

CREATE TABLE IF NOT EXISTS "Charge" (
  "id"                    TEXT PRIMARY KEY,
  "userId"                TEXT REFERENCES "User"("id"),
  "guestEmail"            TEXT,
  "orderId"               TEXT REFERENCES "Order"("id"),
  "savedCardId"           TEXT REFERENCES "SavedCard"("id"),
  "kind"                  "ChargeKind" NOT NULL DEFAULT 'ORDER',
  "status"                "ChargeStatus" NOT NULL DEFAULT 'PENDING',
  "amountEUR"             DECIMAL(10, 2) NOT NULL,
  "stripePaymentIntentId" TEXT,
  "stripeSessionId"       TEXT,
  "failureMessage"        TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- These two uniques are what make a replayed Stripe webhook harmless.
CREATE UNIQUE INDEX IF NOT EXISTS "Charge_stripePaymentIntentId_key" ON "Charge"("stripePaymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Charge_stripeSessionId_key" ON "Charge"("stripeSessionId");
CREATE INDEX IF NOT EXISTS "Charge_userId_createdAt_idx" ON "Charge"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Charge_orderId_idx" ON "Charge"("orderId");

CREATE TABLE IF NOT EXISTS "GameAccount" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "gameSlug"  TEXT NOT NULL,
  "ign"       TEXT NOT NULL,
  "region"    TEXT NOT NULL,
  "roles"     JSONB NOT NULL DEFAULT '[]'::jsonb,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "GameAccount_userId_gameSlug_idx" ON "GameAccount"("userId", "gameSlug");
