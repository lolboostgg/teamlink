-- Teammate-initiated payout requests, settled by an admin.

DO $$
BEGIN
  CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "PayoutRequest" (
  "id"             TEXT PRIMARY KEY,
  "requestNo"      INTEGER,
  "teammateId"     TEXT NOT NULL REFERENCES "Teammate"("id") ON DELETE CASCADE,
  "payoutMethodId" TEXT NOT NULL REFERENCES "PayoutMethod"("id"),
  -- NULL means "whatever the balance is when this is processed". See the
  -- model comment in schema.prisma for why that is stored as intent.
  "amountEUR"      DECIMAL(10, 2),
  "feePercent"     DECIMAL(5, 2) NOT NULL,
  "note"           TEXT,
  "status"         "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
  "grossEUR"       DECIMAL(10, 2),
  "feeEUR"         DECIMAL(10, 2),
  "netEUR"         DECIMAL(10, 2),
  "adminNote"      TEXT,
  "processedById"  TEXT REFERENCES "User"("id"),
  "processedAt"    TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS "PayoutRequest_requestNo_seq" START WITH 100;
ALTER SEQUENCE "PayoutRequest_requestNo_seq" OWNED BY "PayoutRequest"."requestNo";
ALTER TABLE "PayoutRequest" ALTER COLUMN "requestNo" SET DEFAULT nextval('"PayoutRequest_requestNo_seq"');

UPDATE "PayoutRequest" SET "requestNo" = nextval('"PayoutRequest_requestNo_seq"') WHERE "requestNo" IS NULL;
ALTER TABLE "PayoutRequest" ALTER COLUMN "requestNo" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PayoutRequest_requestNo_key" ON "PayoutRequest"("requestNo");
CREATE INDEX IF NOT EXISTS "PayoutRequest_teammateId_createdAt_idx" ON "PayoutRequest"("teammateId", "createdAt");
CREATE INDEX IF NOT EXISTS "PayoutRequest_status_idx" ON "PayoutRequest"("status");
