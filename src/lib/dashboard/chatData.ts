export interface ChatConversation {
  id: string;
  withName: string;
  gameName: string;
  // Real messages live in lib/matchmaking/chatStore.ts, keyed by this —
  // see conversationKey() there. Conversations on both sides are derived
  // from real matched orders (ClientChatContent.tsx / TeammateChatContent.tsx),
  // not a static mock list.
  conversationKey: string;
  orderNo: number;
  status?: "active" | "completed";
  lockedAt?: number | null;
}
