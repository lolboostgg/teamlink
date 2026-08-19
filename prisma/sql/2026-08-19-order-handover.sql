-- Teammate-to-teammate handover of an assigned order.
CREATE TABLE IF NOT EXISTS "OrderHandover" (
  "id"             TEXT PRIMARY KEY,
  "token"          TEXT NOT NULL,
  "orderId"        TEXT NOT NULL,
  "fromTeammateId" TEXT NOT NULL,
  "toTeammateId"   TEXT,
  "note"           TEXT,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "acceptedAt"     TIMESTAMP(3),
  "declinedAt"     TIMESTAMP(3),
  "revokedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderHandover_token_key"
ON "OrderHandover"("token");

CREATE INDEX IF NOT EXISTS "OrderHandover_orderId_idx"
ON "OrderHandover"("orderId");

CREATE INDEX IF NOT EXISTS "OrderHandover_fromTeammateId_createdAt_idx"
ON "OrderHandover"("fromTeammateId", "createdAt");

-- Cascade on the order for the same reason DispatchCandidate does: a deleted
-- order has no handovers to answer for. The teammate references restrict,
-- so a handover keeps naming who offered it.
ALTER TABLE "OrderHandover"
DROP CONSTRAINT IF EXISTS "OrderHandover_orderId_fkey";
ALTER TABLE "OrderHandover"
ADD CONSTRAINT "OrderHandover_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderHandover"
DROP CONSTRAINT IF EXISTS "OrderHandover_fromTeammateId_fkey";
ALTER TABLE "OrderHandover"
ADD CONSTRAINT "OrderHandover_fromTeammateId_fkey"
FOREIGN KEY ("fromTeammateId") REFERENCES "Teammate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderHandover"
DROP CONSTRAINT IF EXISTS "OrderHandover_toTeammateId_fkey";
ALTER TABLE "OrderHandover"
ADD CONSTRAINT "OrderHandover_toTeammateId_fkey"
FOREIGN KEY ("toTeammateId") REFERENCES "Teammate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
