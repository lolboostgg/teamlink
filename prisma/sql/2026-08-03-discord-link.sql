-- Discord account linking (User.discordUsername / discordAvatar / discordLinkedAt).
-- discordId already exists; only the display cache and the link timestamp are new.
-- Run once against the Supabase database, then `npx prisma generate`.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "discordUsername" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "discordAvatar"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "discordLinkedAt" TIMESTAMP(3);

-- Anything that was linked before we stored a handle keeps working: the UI
-- falls back to the raw snowflake until that account re-links.
UPDATE "User"
   SET "discordLinkedAt" = "createdAt"
 WHERE "discordId" IS NOT NULL
   AND "discordLinkedAt" IS NULL;
