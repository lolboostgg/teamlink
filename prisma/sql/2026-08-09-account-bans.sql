-- Admin-issued account bans.
--
-- A timestamp rather than a boolean: "banned" without "since when" is the
-- first thing anyone asks about a locked account. The reason travels with it
-- because it is shown to the person on the sign-in screen — a lockout with no
-- explanation is a support ticket by construction.
--
-- Idempotent like every file in here (see README): safe to re-run.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedReason" TEXT;

-- Bans are read on every sign-in and on the throttled session re-check, and
-- the admin list filters on them; partial so it only carries the rows that
-- are actually banned, which is approximately none of them.
CREATE INDEX IF NOT EXISTS "User_bannedAt_idx" ON "User" ("bannedAt") WHERE "bannedAt" IS NOT NULL;
