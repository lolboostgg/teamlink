-- Indexes for the query shapes that are free today and expensive later.
--
-- Every one came from an EXPLAIN showing a Sort (or a Seq Scan) on top of a
-- filter: Postgres fetches every row matching the WHERE, sorts the lot, and
-- discards all but the LIMIT. At a few hundred rows that costs nothing and
-- shows up in no timing. It is the shape that stops scaling, not the current
-- duration, so these go in before the data arrives rather than after somebody
-- notices.
--
-- Plain CREATE INDEX, not CONCURRENTLY. Concurrently is the right choice on a
-- large table, but it cannot run inside a transaction and the pooler on port
-- 6543 hands the connection back between statements — the first attempt at
-- this file simply hung. These tables are in the hundreds of rows, so the
-- build and its lock are measured in milliseconds. If they are ever rebuilt
-- at a size where that is not true, run it against a session connection
-- (port 5432) with CONCURRENTLY added.

-- The endpoint every open dashboard tab polls: one customer's orders, newest
-- first. Filter and sort in one index, so the newest forty come off it in
-- order instead of being sorted out of everything they ever booked.
CREATE INDEX IF NOT EXISTS "Order_clientUserId_createdAt_idx"
ON "Order" ("clientUserId", "createdAt");

-- Superseded by the composite above, which serves the same lookups by prefix.
DROP INDEX IF EXISTS "Order_clientUserId_idx";

-- The bell asks two questions. [userId, readAt] answers "how many unread";
-- this answers "the newest thirty", which was being served by sorting
-- everything the other index returned.
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
ON "Notification" ("userId", "createdAt");

-- A teammate's own session history. Grows per wave invited to rather than per
-- order taken, so it grows faster than anything else keyed to one person.
CREATE INDEX IF NOT EXISTS "DispatchCandidate_teammateId_invitedAt_idx"
ON "DispatchCandidate" ("teammateId", "invitedAt");

-- The admin support queue reads every ticket newest-first with no filter, and
-- [status, updatedAt] cannot serve that: a leading column the query does not
-- mention is an index the planner skips.
CREATE INDEX IF NOT EXISTS "Dispute_updatedAt_idx"
ON "Dispute" ("updatedAt");

-- The reporter's own tickets, filtered by opener and ordered by activity.
CREATE INDEX IF NOT EXISTS "Dispute_openedById_updatedAt_idx"
ON "Dispute" ("openedById", "updatedAt");

DROP INDEX IF EXISTS "Dispute_openedById_idx";

-- "Who can be invited right now", asked by every dispatch wave, the live
-- teammates endpoint and the game availability check. Teammate carried no
-- index at all, so all three were sequential scans.
CREATE INDEX IF NOT EXISTS "Teammate_available_lastSeenAt_idx"
ON "Teammate" ("available", "lastSeenAt");
