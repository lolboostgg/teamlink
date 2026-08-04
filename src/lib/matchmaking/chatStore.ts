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
  from: "client" | "teammate" | "admin";
  text: string;
  createdAt: number;
  readBy?: ("client" | "teammate" | "admin")[];
}

const KEY = "teamlink:chat-messages";
const CHANNEL_NAME = "teamlink-chat";
const PRESENCE_KEY = "teamlink:chat-presence";
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

function writeConversation(key: string, messages: ChatMessage[]): void {
  const otherMessages = readAll().filter((message) => message.conversationKey !== key);
  writeAll([...otherMessages, ...messages]);
}

async function persistMessage(message: ChatMessage): Promise<void> {
  await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: message.id,
      key: message.conversationKey,
      from: message.from,
      text: message.text,
      createdAt: message.createdAt,
    }),
  }).catch(() => undefined);
}

export function sendChatMessage(key: string, from: "client" | "teammate" | "admin", text: string): void {
  const trimmed = text.trim();
  if (!trimmed || typeof window === "undefined") return;
  const messages = readAll();
  const message: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationKey: key,
    from,
    text: trimmed,
    createdAt: Date.now(),
    readBy: [from],
  };
  messages.push(message);
  writeAll(messages);
  void persistMessage(message);
}

type ChatSide = "client" | "teammate";
type Presence = Record<string, Partial<Record<ChatSide, number>>>;

function readPresence(): Presence {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(PRESENCE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function setChatTyping(key: string, side: ChatSide, typing: boolean): void {
  if (typeof window === "undefined") return;
  const presence = readPresence();
  presence[key] = { ...presence[key], [side]: typing ? Date.now() + 1800 : 0 };
  window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(presence));
  getChannel()?.postMessage({ type: "chat-presence" });
  void fetch("/api/chat", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, side, action: "typing", typing }) }).catch(() => undefined);
}

export function isChatTyping(key: string, side: ChatSide): boolean {
  return (readPresence()[key]?.[side] ?? 0) > Date.now();
}

export function markConversationRead(key: string, side: ChatSide): void {
  const messages = readAll();
  let changed = false;
  const next = messages.map((message) => {
    if (message.conversationKey !== key || message.from === side || message.readBy?.includes(side)) return message;
    changed = true;
    return { ...message, readBy: [...(message.readBy ?? [message.from]), side] };
  });
  if (changed) {
    writeAll(next);
    void fetch("/api/chat", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, side, action: "read" }) }).catch(() => undefined);
  }
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
    if (!key) return;
    let cancelled = false;
    let migrated = false;
    const sync = async () => {
      if (!migrated) {
        migrated = true;
        await Promise.all(getMessages(key).map(persistMessage));
      }
      try {
        const response = await fetch(`/api/chat?key=${encodeURIComponent(key)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { messages?: ChatMessage[]; typing?: Partial<Record<ChatSide, number>> };
        if (!cancelled && data.messages) {
          writeConversation(key, data.messages);
          if (data.typing) {
            const presence = readPresence();
            presence[key] = { ...presence[key], ...data.typing };
            window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(presence));
            getChannel()?.postMessage({ type: "chat-presence" });
          }
          setMessages(data.messages);
        }
      } catch {
        // Keep the last local copy and retry on the next poll.
      }
    };
    void sync();
    const interval = window.setInterval(sync, 2000);
    const unsubscribe = subscribeToChat(refresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [key, refresh]);

  return { messages, refresh };
}

export function useChatTyping(key: string, otherSide: ChatSide): boolean {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const refresh = () => setTyping(isChatTyping(key, otherSide));
    refresh();
    const interval = setInterval(refresh, 500);
    const unsubscribe = subscribeToChat(refresh);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [key, otherSide]);

  return typing;
}
