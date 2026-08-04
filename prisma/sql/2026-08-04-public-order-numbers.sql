ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNo" INTEGER;

CREATE SEQUENCE IF NOT EXISTS "Order_orderNo_seq" START WITH 1000;
ALTER SEQUENCE "Order_orderNo_seq" OWNED BY "Order"."orderNo";
ALTER TABLE "Order" ALTER COLUMN "orderNo" SET DEFAULT nextval('"Order_orderNo_seq"');

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") + 999 AS number
  FROM "Order"
  WHERE "orderNo" IS NULL
)
UPDATE "Order" SET "orderNo" = numbered.number
FROM numbered WHERE "Order"."id" = numbered."id";

SELECT setval('"Order_orderNo_seq"', GREATEST(999, COALESCE((SELECT MAX("orderNo") FROM "Order"), 999)));
ALTER TABLE "Order" ALTER COLUMN "orderNo" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key" ON "Order"("orderNo");
