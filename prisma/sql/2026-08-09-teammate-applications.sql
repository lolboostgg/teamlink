-- Teammate applications from the public form at /become-a-teammate.
--
-- Until now the form only mailed support, which meant no list to work
-- through, no way to tell a second application from a first, and no record
-- of who was declined. This is that list. An accepted row still has to
-- become a TeammateInvite before an account can exist — nothing here creates
-- a teammate on its own.
--
-- The unique index on email is the duplicate check. Letting somebody apply
-- again after a decline is an admin deleting their row, which is deliberate.
--
-- Idempotent like every file in here: safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
    CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'INVITED', 'DECLINED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "TeammateApplication" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "discord"      TEXT NOT NULL,
  "country"      TEXT,
  "games"        JSONB NOT NULL,
  "ranks"        TEXT,
  "hours"        TEXT,
  "experience"   TEXT,
  "status"       "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "inviteId"     TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeammateApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeammateApplication_email_key"
  ON "TeammateApplication" ("email");

CREATE INDEX IF NOT EXISTS "TeammateApplication_status_createdAt_idx"
  ON "TeammateApplication" ("status", "createdAt");

-- Reviewer is nullable and set null on delete: losing the admin account must
-- never take the application history with it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeammateApplication_reviewedById_fkey'
  ) THEN
    ALTER TABLE "TeammateApplication"
      ADD CONSTRAINT "TeammateApplication_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
