"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveSync } from "@/lib/events/useLiveSync";

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

const KEY = "qup:chat-messages";
const CHANNEL_NAME = "qup-chat";
const PRESENCE_KEY = "qup:chat-presence";
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

// One conversation per order, per teammate on it. A booking is a session
// with a start and an end, so the next order between the same two people
// opens an empty thread rather than reopening the last one — and a teammate
// joining an order never sees what was said on the previous booking.
//
// The order id is also what the API resolves both the reader's side and
// their access from (see app/api/chat/route.ts), which is why the key leads
// with it.
export function conversationKey(orderId: string, teammateId: string): string {
  return `${orderId}::${teammateId}`;
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

// `from` deliberately isn't sent: which side a message came from is decided
// by the server off this order's own client/teammate rows, not by whatever
// the browser claims. The local value is only the optimistic echo, and the
// next sync replaces it with the stored row either way.
async function persistMessage(message: ChatMessage, accessToken?: string | null): Promise<void> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(accessToken ? { "x-order-token": accessToken } : {}) },
      body: JSON.stringify({
        id: message.id,
        key: message.conversationKey,
        text: message.text,
        createdAt: message.createdAt,
      }),
    });

    // A rejected message used to be swallowed whole: the optimistic copy sat
    // in localStorage looking sent, the next sync replaced the thread with
    // the server's version, and the message simply vanished with nothing
    // said and nothing logged. Whatever the reason for the rejection, it has
    // to be visible somewhere.
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[chat] message rejected:", res.status, detail);
      dropMessage(message.conversationKey, message.id);
    }
  } catch (err) {
    console.error("[chat] message could not be sent:", err);
    dropMessage(message.conversationKey, message.id);
  }
}

/** Removes an optimistic copy the server never accepted, so the thread stops
 * showing a message that does not exist. */
function dropMessage(key: string, id: string): void {
  if (typeof window === "undefined") return;
  writeAll(readAll().filter((m) => m.id !== id));
  window.dispatchEvent(new CustomEvent("qup-chat-rejected", { detail: { key, id } }));
}

export function sendChatMessage(key: string, from: "client" | "teammate" | "admin", text: string, accessToken?: string | null): void {
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
  void persistMessage(message, accessToken);
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

export function setChatTyping(key: string, side: ChatSide, typing: boolean, accessToken?: string | null): void {
  if (typeof window === "undefined") return;
  const presence = readPresence();
  presence[key] = { ...presence[key], [side]: typing ? Date.now() + 1800 : 0 };
  window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(presence));
  getChannel()?.postMessage({ type: "chat-presence" });
  void fetch("/api/chat", { method: "PATCH", headers: { "Content-Type": "application/json", ...(accessToken ? { "x-order-token": accessToken } : {}) }, body: JSON.stringify({ key, action: "typing", typing }) }).catch(() => undefined);
}

export function isChatTyping(key: string, side: ChatSide): boolean {
  return (readPresence()[key]?.[side] ?? 0) > Date.now();
}

export function markConversationRead(key: string, side: ChatSide, accessToken?: string | null): void {
  const messages = readAll();
  let changed = false;
  const next = messages.map((message) => {
    if (message.conversationKey !== key || message.from === side || message.readBy?.includes(side)) return message;
    changed = true;
    return { ...message, readBy: [...(message.readBy ?? [message.from]), side] };
  });
  if (changed) {
    writeAll(next);
    void fetch("/api/chat", { method: "PATCH", headers: { "Content-Type": "application/json", ...(accessToken ? { "x-order-token": accessToken } : {}) }, body: JSON.stringify({ key, action: "read" }) }).catch(() => undefined);
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

export function useConversationMessages(key: string | undefined, accessToken?: string | null): { messages: ChatMessage[]; refresh: () => void } {
  const [messages, setMessages] = useState<ChatMessage[]>(() => (key ? getMessages(key) : []));

  const refresh = useCallback(() => {
    setMessages(key ? getMessages(key) : []);
  }, [key]);

  // One-time upload of anything this browser wrote before the chat was
  // persisted server-side. Guarded by a ref so a re-render can't redo it.
  const migrated = useRef(false);

  const sync = useCallback(async () => {
    if (!key) return;
    if (!migrated.current) {
      migrated.current = true;
      await Promise.all(getMessages(key).map((message) => persistMessage(message, accessToken)));
    }
    const response = await fetch(`/api/chat?key=${encodeURIComponent(key)}`, {
      cache: "no-store",
      headers: accessToken ? { "x-order-token": accessToken } : undefined,
    });
    // Deliberately thrown rather than swallowed: usePoll reads a rejection as
    // "back off", which is what should happen when the chat API is down.
    if (!response.ok) throw new Error(`Chat sync failed: ${response.status}`);
    const data = (await response.json()) as { messages?: ChatMessage[]; typing?: Partial<Record<ChatSide, number>> };
    if (!data.messages) return;
    writeConversation(key, data.messages);
    if (data.typing) {
      const presence = readPresence();
      presence[key] = { ...presence[key], ...data.typing };
      window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(presence));
      getChannel()?.postMessage({ type: "chat-presence" });
    }
    setMessages(data.messages);
  }, [key, accessToken]);

  const orderId = key?.split("::", 1)[0];
  useLiveSync("chat", sync, 2000, {
    enabled: Boolean(key), key,
    guestOrder: orderId && accessToken ? { id: orderId, token: accessToken } : undefined,
  });

  useEffect(() => {
    if (!key) return subscribeToChat(refresh);
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
