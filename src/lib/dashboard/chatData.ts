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

// Client-side conversations are now derived from real matched teammates —
// see ClientChatContent.tsx — instead of a static mock list here.

export const TEAMMATE_CONVERSATIONS: ChatConversation[] = [
  {
    id: "conv-1",
    withName: "Mara Feld",
    gameName: "League of Legends",
    lastMessage: "Perfect, see you in the lobby!",
    unread: 1,
    messages: [
      { id: "m1", from: "them", text: "Hi! Excited for our session today", time: "17:40" },
      { id: "m2", from: "me", text: "Same! I'll invite you in a few minutes", time: "17:41" },
      { id: "m3", from: "them", text: "Perfect, see you in the lobby!", time: "17:42" },
    ],
  },
  {
    id: "conv-2",
    withName: "Owen Brooks",
    gameName: "Valorant",
    lastMessage: "Thanks for the carry 🙌",
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "Thanks for the carry 🙌", time: "2 days ago" },
    ],
  },
];
