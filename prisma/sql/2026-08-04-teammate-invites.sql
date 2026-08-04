-- One-time registration links for new teammates.

CREATE TABLE IF NOT EXISTS "TeammateInvite" (
  "id"           TEXT PRIMARY KEY,
  "token"        TEXT NOT NULL,
  "note"         TEXT,
  "email"        TEXT,
  "createdById"  TEXT NOT NULL REFERENCES "User"("id"),
  "expiresAt"    TIMESTAMP(3) NOT NULL,
  "openCount"    INTEGER NOT NULL DEFAULT 0,
  "usedAt"       TIMESTAMP(3),
  "usedByUserId" TEXT REFERENCES "User"("id"),
  "revokedAt"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeammateInvite_token_key" ON "TeammateInvite"("token");
-- One account per invite: the redemption path checks this, and the constraint
-- is what actually holds if two people submit the form at the same moment.
CREATE UNIQUE INDEX IF NOT EXISTS "TeammateInvite_usedByUserId_key" ON "TeammateInvite"("usedByUserId");
CREATE INDEX IF NOT EXISTS "TeammateInvite_createdAt_idx" ON "TeammateInvite"("createdAt");
