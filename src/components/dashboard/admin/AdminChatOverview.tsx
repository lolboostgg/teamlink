"use client";

import { useMemo, useState } from "react";
import { AvatarIcon } from "@/components/ui/AvatarIcon";

export type AdminChatMessage = { id: string; from: string; text: string; createdAt: number };
export type AdminConversation = {
  key: string;
  clientName: string;
  teammateName: string;
  gameName: string;
  status: "active" | "completed";
  messages: AdminChatMessage[];
};

export function AdminChatOverview({ conversations }: { conversations: AdminConversation[] }) {
  const [activeKey, setActiveKey] = useState(conversations[0]?.key);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((item) => [item.clientName, item.teammateName, item.gameName, item.messages.at(-1)?.text]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [conversations, query]);
  const active = conversations.find((item) => item.key === activeKey) ?? filtered[0] ?? conversations[0];

  if (!conversations.length) return <div className="dashboard-empty"><i className="fa-solid fa-comment-slash" /><p>No conversations yet.</p></div>;

  return (
    <div className="chat-layout admin-chat-overview">
      <aside className="chat-list">
        <label className="admin-chat-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats…" aria-label="Search chats" />
        </label>
        {filtered.map((conversation) => (
          <button key={conversation.key} type="button" className={`chat-list__item${conversation.key === active?.key ? " is-active" : ""}`} onClick={() => setActiveKey(conversation.key)}>
            <span className="chat-list__avatar"><AvatarIcon seed={conversation.key} /></span>
            <span className="chat-list__meta">
              <span className="chat-list__name">{conversation.clientName} <i className="fa-solid fa-arrow-right-long" /> {conversation.teammateName}</span>
              <span className="chat-list__last">{conversation.messages.at(-1)?.text ?? `No messages · ${conversation.gameName}`}</span>
            </span>
            {conversation.status === "completed" && <span className="chat-status-badge">Completed</span>}
          </button>
        ))}
      </aside>
      {active && <section className="chat-thread">
        <header className="chat-thread__head">
          <span className="chat-list__avatar"><AvatarIcon seed={active.key} /></span>
          <div className="chat-thread__identity">
            <div className="chat-thread__name">{active.clientName} <i className="fa-solid fa-arrow-right-long" /> {active.teammateName}{active.status === "completed" && <span className="chat-status-badge">Completed</span>}</div>
            <div className="chat-thread__game">{active.gameName} · Read-only moderation view</div>
          </div>
        </header>
        <div className="chat-thread__messages">
          {!active.messages.length && <p className="chat-thread__empty">No messages in this conversation yet.</p>}
          {active.messages.map((message) => <div key={message.id} className={`chat-bubble chat-bubble--${message.from === "teammate" ? "me" : "them"}`}>
            <strong className="admin-chat-sender">{message.from === "teammate" ? active.teammateName : active.clientName}</strong>
            <p>{message.text}</p>
            <span>{new Date(message.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>)}
        </div>
        <div className="chat-thread__locked"><i className="fa-solid fa-eye" /><span><strong>Admin overview</strong>Messages are shown read only.</span></div>
      </section>}
    </div>
  );
}
