-- Message bubbles keep the name of whoever actually wrote them.
--
-- A handover moves the thread from one teammate to the next (see
-- lib/orderHandover.ts), and every teammate bubble was labelled with the
-- teammate currently on the order — so accepting a handover retroactively
-- rewrote the previous booster's messages, and the intro line, into the new
-- booster's name. The name is now stamped on the row when it is written.
--
-- Existing rows stay NULL and fall back to the current names, which is what
-- they were already showing.
ALTER TABLE "ConversationMessage"
ADD COLUMN IF NOT EXISTS "senderName" TEXT;
