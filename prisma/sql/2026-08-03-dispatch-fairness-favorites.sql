ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "availableSince" TIMESTAMP(3);
ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "lastDispatchAt" TIMESTAMP(3);
ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "lastAssignedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "FavoriteTeammate" (
  "clientUserId" TEXT NOT NULL,
  "teammateId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FavoriteTeammate_pkey" PRIMARY KEY ("clientUserId", "teammateId"),
  CONSTRAINT "FavoriteTeammate_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FavoriteTeammate_teammateId_fkey" FOREIGN KEY ("teammateId") REFERENCES "Teammate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FavoriteTeammate_teammateId_idx" ON "FavoriteTeammate"("teammateId");
