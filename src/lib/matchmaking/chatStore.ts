"use client";

import { useCallback, useEffect, useState } from "react";

// Real, shared chat, same architecture as lib/matchmaking/store.ts: a
// localStorage-backed record pushed to other tabs of the same browser via
// BroadcastChannel — genuinely real cross-tab push, not a poll. Used by
// both the in-session chat (SessionChat) and the dashboard chat tabs
// (DashboardChat via Client/TeammateChatContent) so a message sent in
// either place is the same conversation, not three separate demo threads.
// Same same-browser-only limitation as the rest of the matchmaking
// simulation — true cross-device delivery needs the real DB migration.
export interface ChatMessage {
  id: string;
  conversationKey: string;
  from: "client" | "teammate";
  text: string;
  createdAt: number;
}

const KEY = "teamlink:chat-messages";
const CHANNEL_NAME = "teamlink-chat";
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

// One conversation per teammate<->client pair — every order between the
// same two keeps landing in the same thread, matching how the dashboard
// chat lists already group by teammate/client.
export function conversationKey(teammateId: string, customerLabel: string): string {
  return `${teammateId}::${customerLabel}`;
}

function readAll(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeAll(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(messages));
  getChannel()?.postMessage({ type: "chat-updated" });
}

export function sendChatMessage(key: string, from: "client" | "teammate", text: string): void {
  const trimmed = text.trim();
  if (!trimmed || typeof window === "undefined") return;
  const messages = readAll();
  messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationKey: key,
    from,
    text: trimmed,
    createdAt: Date.now(),
  });
  writeAll(messages);
}

export function getMessages(key: string): ChatMessage[] {
  return readAll()
    .filter((m) => m.conversationKey === key)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function getLastMessage(key: string): ChatMessage | undefined {
  const messages = getMessages(key);
  return messages[messages.length - 1];
}

function subscribeToChat(callback: () => void): () => void {
  const ch = getChannel();
  ch?.addEventListener("message", callback);
  window.addEventListener("storage", callback);
  return () => {
    ch?.removeEventListener("message", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useConversationMessages(key: string | undefined): { messages: ChatMessage[]; refresh: () => void } {
  const [messages, setMessages] = useState<ChatMessage[]>(() => (key ? getMessages(key) : []));

  const refresh = useCallback(() => {
    setMessages(key ? getMessages(key) : []);
  }, [key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    return subscribeToChat(refresh);
  }, [key, refresh]);

  return { messages, refresh };
}
