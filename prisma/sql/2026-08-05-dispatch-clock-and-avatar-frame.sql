-- When the search actually started, and how a teammate framed their picture.

-- An order row is written when checkout opens and only fanned out to
-- teammates once the payment clears, so createdAt is not the start of the
-- search — the customer's "searching for a teammate" clock was already
-- minutes in by the time anyone was invited.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);

-- Backfill: the dispatch window is a fixed 60s, so the deadline stored on
-- every already-dispatched order is exactly one window after it went out.
UPDATE "Order"
SET "dispatchedAt" = "dispatchDeadline" - INTERVAL '60 seconds'
WHERE "dispatchedAt" IS NULL AND "status" <> 'AWAITING_PAYMENT';

-- Where the uploaded picture sits inside its frame: focal point in percent
-- of the image, plus a zoom in percent. Defaults are dead centre, unzoomed,
-- which is exactly what a centre-cropped avatar already looked like.
ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "avatarFocusX" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "avatarFocusY" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Teammate" ADD COLUMN IF NOT EXISTS "avatarZoom" INTEGER NOT NULL DEFAULT 100;
