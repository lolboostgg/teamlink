"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sendChatMessage, useConversationMessages } from "@/lib/matchmaking/chatStore";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export type AdminChatMessage = { id: string; from: string; text: string; createdAt: number };
export type AdminConversation = {
  key: string;
  orderNo: number;
  clientName: string;
  clientAvatarUrl: string | null;
  teammateName: string;
  teammateAvatarUrl: string | null;
  gameName: string;
  status: "active" | "completed";
  messages: AdminChatMessage[];
};

export function AdminChatOverview({ conversations, initialKey }: { conversations: AdminConversation[]; initialKey?: string }) {
  const [activeKey, setActiveKey] = useState(initialKey && conversations.some((item) => item.key === initialKey) ? initialKey : conversations[0]?.key);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((item) => [`#${item.orderNo}`, item.clientName, item.teammateName, item.gameName, item.messages.at(-1)?.text]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [conversations, query]);
  const active = conversations.find((item) => item.key === activeKey) ?? filtered[0] ?? conversations[0];
  const { messages, refresh } = useConversationMessages(active?.key);

  // Same two-rAF-plus-ResizeObserver approach as the in-session chat (see
  // SessionChat.tsx) — a single rAF still lands mid-layout for a freshly
  // added message and scrolls to the previous, shorter height.
  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    });
    const observer = new ResizeObserver(() => {
      element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      observer.disconnect();
    };
  }, [active?.key, messages.length]);

  function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    sendChatMessage(active.key, "admin", text);
    refresh();
    setDraft("");
  }

  if (!conversations.length) return <div className="dashboard-empty"><i className="fa-solid fa-comment-slash" /><p>No conversations yet.</p></div>;

  return <div className="chat-layout admin-chat-overview">
    <aside className="chat-list">
      <label className="admin-chat-search"><i className="fa-solid fa-magnifying-glass" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats or order ID…" aria-label="Search chats" /></label>
      {filtered.map((conversation) => <button key={conversation.key} type="button" className={`chat-list__item${conversation.key === active?.key ? " is-active" : ""}`} onClick={() => setActiveKey(conversation.key)}>
        <span className="chat-list__avatar"><SafeAvatarImage src={conversation.clientAvatarUrl} /></span>
        <span className="chat-list__meta"><span className="chat-list__name">{conversation.clientName} <i className="fa-solid fa-arrow-right-long" /> {conversation.teammateName}</span><span className="chat-list__last">#{conversation.orderNo} · {conversation.messages.at(-1)?.text ?? `No messages · ${conversation.gameName}`}</span></span>
        {conversation.status === "completed" && <span className="chat-status-badge">Completed</span>}
      </button>)}
    </aside>
    {active && <section className="chat-thread">
      <header className="chat-thread__head"><span className="chat-list__avatar"><SafeAvatarImage src={active.clientAvatarUrl} /></span><div className="chat-thread__identity"><div className="chat-thread__name">{active.clientName} <small>(Client)</small> <i className="fa-solid fa-arrow-right-long" /> {active.teammateName} <small>(Teammate)</small>{active.status === "completed" && <span className="chat-status-badge">Completed</span>}</div><div className="chat-thread__game">Order #{active.orderNo} · {active.gameName}</div></div></header>
      <div className="chat-thread__messages" ref={messagesRef}>
        {!messages.length && <p className="chat-thread__empty">No messages in this conversation yet.</p>}
        {messages.map((message) => {
          const senderName = message.from === "admin" ? "Admin" : message.from === "teammate" ? active.teammateName : active.clientName;
          const avatarUrl = message.from === "teammate" ? active.teammateAvatarUrl : active.clientAvatarUrl;
          const rightSide = message.from === "teammate" || message.from === "admin";
          return <div key={message.id} className={`admin-overview-message admin-overview-message--${message.from}`}>
            {!rightSide && <span className="admin-order-chat__avatar"><SafeAvatarImage src={avatarUrl} /></span>}
            <div className={`chat-bubble chat-bubble--${rightSide ? "me" : "them"}`}><strong className="admin-chat-sender">{senderName} <small>({message.from === "admin" ? "Admin" : message.from === "teammate" ? "Teammate" : "Client"})</small></strong><p>{message.text}</p><span>{new Date(message.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span></div>
            {rightSide && <span className={`admin-order-chat__avatar${message.from === "admin" ? " admin-overview-message__admin-icon" : ""}`}>{message.from === "admin" ? <i className="fa-solid fa-shield-halved" /> : <SafeAvatarImage src={avatarUrl} />}</span>}
          </div>;
        })}
      </div>
      <form className="chat-thread__input" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message about order #${active.orderNo}…`} /><button type="submit" aria-label="Send as admin"><i className="fa-solid fa-paper-plane" /></button></form>
    </section>}
  </div>;
}
