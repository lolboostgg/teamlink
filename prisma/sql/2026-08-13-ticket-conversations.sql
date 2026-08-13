-- Support tickets become a conversation.
--
-- Three things happen here: the status vocabulary is replaced, tickets learn
-- whether the reporter closed their own, and notes learn which side wrote
-- them so a thread can be rendered without joining every author's User row.

-- 1. PENDING / IN_PROGRESS / SOLVED.
--
-- Postgres cannot rename or drop enum values in place, so the type is rebuilt
-- and the column carried across. Guarded on 'OPEN' still existing, which
-- makes the whole block a no-op on a database that already ran it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DisputeStatus' AND e.enumlabel = 'OPEN'
  ) THEN
    CREATE TYPE "DisputeStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'SOLVED');

    ALTER TABLE "Dispute" ALTER COLUMN "status" DROP DEFAULT;

    -- WAITING folds into IN_PROGRESS: it meant "support is blocked on the
    -- reporter", which from the reporter's side was still an open ticket
    -- somebody was working on.
    ALTER TABLE "Dispute"
      ALTER COLUMN "status" TYPE "DisputeStatus_new"
      USING (
        CASE "status"::text
          WHEN 'OPEN'          THEN 'PENDING'
          WHEN 'INVESTIGATING' THEN 'IN_PROGRESS'
          WHEN 'WAITING'       THEN 'IN_PROGRESS'
          WHEN 'RESOLVED'      THEN 'SOLVED'
          ELSE 'PENDING'
        END
      )::"DisputeStatus_new";

    DROP TYPE "DisputeStatus";
    ALTER TYPE "DisputeStatus_new" RENAME TO "DisputeStatus";

    ALTER TABLE "Dispute" ALTER COLUMN "status" SET DEFAULT 'PENDING';
  END IF;
END $$;

-- 2. Who closed it. Everything that exists now was closed by support, if it
-- was closed at all, so the default is the correct backfill.
ALTER TABLE "Dispute"
ADD COLUMN IF NOT EXISTS "closedByReporter" BOOLEAN NOT NULL DEFAULT false;

-- 3. Which side wrote a note.
--
-- Every note that exists today was written by an admin from the triage form —
-- there was no other way to create one — so they are all stamped ADMIN rather
-- than left on the column default. New rows pass their own value.
ALTER TABLE "DisputeNote"
ADD COLUMN IF NOT EXISTS "authorRole" "Role" NOT NULL DEFAULT 'CLIENT';

UPDATE "DisputeNote" SET "authorRole" = 'ADMIN' WHERE "internal" = true;
