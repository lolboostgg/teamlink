-- What was chosen about the booked mode, beyond its name.
--
-- World of Warcraft's modes ask for a keystone level, a rating bracket, a
-- bundle or a coaching focus (see lib/bookingOptions.ts), and those answers
-- move the price. The order has to carry them: "Mythic+ Dungeon single run"
-- alone does not tell the teammate whether they are running a +2 or a +20.
--
-- Stored as label/value pairs, not catalogue keys, so an order still reads
-- correctly after the catalogue is rewritten underneath it. Existing orders
-- stay NULL, which reads as "this mode asked nothing".
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "optionExtras" JSONB;
