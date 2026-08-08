-- Two states a payment can be in that this app had no word for.
--
-- A guest's checkout only *authorises* now: the bank reserves the money and
-- we take it when the session actually starts. Between those two points the
-- charge is neither pending nor succeeded -- the money is promised but not
-- ours -- and an order that ends before it starts releases the reservation
-- rather than refunding it.
--
-- The difference is the processing fee. Stripe keeps its cut on a refund, so
-- every guest order that never turned into a session cost us the fee on money
-- we gave straight back. A released authorisation is never charged at all, so
-- there is no fee to lose.
--
-- Accounts deliberately stay on immediate capture: their cancellations end in
-- store credit, no refund is raised, and no fee is lost either way.

ALTER TYPE "ChargeStatus" ADD VALUE IF NOT EXISTS 'AUTHORIZED';
ALTER TYPE "ChargeStatus" ADD VALUE IF NOT EXISTS 'VOIDED';
