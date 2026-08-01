export interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
}

export interface ChatConversation {
  id: string;
  withName: string;
  withInitials: string;
  gameName: string;
  lastMessage: string;
  unread: number;
  messages: ChatMessage[];
}

export const CLIENT_CONVERSATIONS: ChatConversation[] = [
  {
    id: "conv-1",
    withName: "Nova",
    withInitials: "NV",
    gameName: "League of Legends",
    lastMessage: "Ready when you are, invite sent!",
    unread: 2,
    messages: [
      { id: "m1", from: "them", text: "Hey! I'll be your teammate for tonight's session 👋", time: "18:02" },
      { id: "m2", from: "me", text: "Awesome, give me 2 minutes to finish loading", time: "18:03" },
      { id: "m3", from: "them", text: "No rush, take your time", time: "18:03" },
      { id: "m4", from: "them", text: "Ready when you are, invite sent!", time: "18:07" },
    ],
  },
  {
    id: "conv-2",
    withName: "Kestrel",
    withInitials: "KS",
    gameName: "Valorant",
    lastMessage: "GGs, thanks for playing!",
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "GGs, thanks for playing!", time: "Yesterday" },
      { id: "m2", from: "me", text: "That was fun, same time next week?", time: "Yesterday" },
    ],
  },
];

export const TEAMMATE_CONVERSATIONS: ChatConversation[] = [
  {
    id: "conv-1",
    withName: "Mara Feld",
    withInitials: "MF",
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
    withInitials: "OB",
    gameName: "Valorant",
    lastMessage: "Thanks for the carry 🙌",
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "Thanks for the carry 🙌", time: "2 days ago" },
    ],
  },
];
