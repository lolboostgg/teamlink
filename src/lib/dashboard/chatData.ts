export interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
}

export interface ChatConversation {
  id: string;
  withName: string;
  gameName: string;
  lastMessage: string;
  unread: number;
  messages: ChatMessage[];
}

// Conversations on both sides are now derived from real matched orders —
// see ClientChatContent.tsx / TeammateChatContent.tsx — instead of a
// static mock list here.
