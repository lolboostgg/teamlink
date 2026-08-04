"use client";

import { useMemo, useState } from "react";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { sendChatMessage, useConversationMessages } from "@/lib/matchmaking/chatStore";

export type AdminChatMessage = { id: string; from: string; text: string; createdAt: number };
export type AdminConversation = {
  key: string;
  orderNo: number;
  clientName: string;
  teammateName: string;
  gameName: string;
  status: "active" | "completed";
  messages: AdminChatMessage[];
};

export function AdminChatOverview({ conversations, initialKey }: { conversations: AdminConversation[]; initialKey?: string }) {
  const [activeKey, setActiveKey] = useState(initialKey && conversations.some((item) => item.key === initialKey) ? initialKey : conversations[0]?.key);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((item) => [`#${item.orderNo}`, item.clientName, item.teammateName, item.gameName, item.messages.at(-1)?.text]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [conversations, query]);
  const active = conversations.find((item) => item.key === activeKey) ?? filtered[0] ?? conversations[0];
  const { messages, refresh } = useConversationMessages(active?.key);

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
        <span className="chat-list__avatar"><AvatarIcon seed={conversation.key} /></span>
        <span className="chat-list__meta"><span className="chat-list__name">{conversation.clientName} <i className="fa-solid fa-arrow-right-long" /> {conversation.teammateName}</span><span className="chat-list__last">#{conversation.orderNo} · {conversation.messages.at(-1)?.text ?? `No messages · ${conversation.gameName}`}</span></span>
        {conversation.status === "completed" && <span className="chat-status-badge">Completed</span>}
      </button>)}
    </aside>
    {active && <section className="chat-thread">
      <header className="chat-thread__head"><span className="chat-list__avatar"><AvatarIcon seed={active.key} /></span><div className="chat-thread__identity"><div className="chat-thread__name">{active.clientName} <i className="fa-solid fa-arrow-right-long" /> {active.teammateName}{active.status === "completed" && <span className="chat-status-badge">Completed</span>}</div><div className="chat-thread__game">Order #{active.orderNo} · {active.gameName}</div></div></header>
      <div className="chat-thread__messages">
        {!messages.length && <p className="chat-thread__empty">No messages in this conversation yet.</p>}
        {messages.map((message) => {
          const senderName = message.from === "admin" ? "Admin" : message.from === "teammate" ? active.teammateName : active.clientName;
          return <div key={message.id} className={`admin-overview-message admin-overview-message--${message.from}`}>
            {message.from !== "admin" && <span className="admin-order-chat__avatar"><AvatarIcon seed={`${message.from}-${senderName}`} /></span>}
            <div className={`chat-bubble chat-bubble--${message.from === "admin" ? "me" : "them"}`}><strong className="admin-chat-sender">{senderName}</strong><p>{message.text}</p><span>{new Date(message.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span></div>
            {message.from === "admin" && <span className="admin-order-chat__avatar admin-overview-message__admin-icon"><i className="fa-solid fa-shield-halved" /></span>}
          </div>;
        })}
      </div>
      <form className="chat-thread__input" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message about order #${active.orderNo}…`} /><button type="submit" aria-label="Send as admin"><i className="fa-solid fa-paper-plane" /></button></form>
    </section>}
  </div>;
}
