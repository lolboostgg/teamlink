-- Gives every order a secret, URL-safe handle of its own.
--
-- Two things ride on it. The checkout stops carrying the whole cart --
-- including the price -- in query parameters that the customer can edit, and
-- becomes /checkout/<token>. And a guest with no account can come back to a
-- running order (from a bookmark, a fresh browser, or the link in their
-- confirmation mail) without us having to hand out the primary key, which is
-- also the id every internal API route is keyed by.
--
-- Nullable on purpose: existing orders keep working without one, and the
-- application mints a token for new orders. Backfilled below anyway so old
-- orders can be linked to as well.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;

-- 24 bytes of pgcrypto randomness, base64 with the URL-unsafe characters
-- swapped out -- same alphabet the application-side generator uses, so tokens
-- minted here and there are indistinguishable.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "Order"
SET "accessToken" = translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_')
WHERE "accessToken" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_accessToken_key" ON "Order"("accessToken");
