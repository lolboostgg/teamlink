CREATE TABLE IF NOT EXISTS "ConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationKey" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "readBy" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConversationMessage_conversationKey_createdAt_idx"
  ON "ConversationMessage"("conversationKey", "createdAt");
