ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "unitPriceEUR" DECIMAL(10, 2);

UPDATE "Order"
SET "unitPriceEUR" = ROUND("priceEUR" / GREATEST("gamesBooked", 1), 2)
WHERE "unitPriceEUR" IS NULL;

ALTER TABLE "Order"
ALTER COLUMN "unitPriceEUR" SET NOT NULL;

ALTER TABLE "Charge"
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Charge_idempotencyKey_key"
ON "Charge"("idempotencyKey");
