"use client";

import { useState } from "react";
import type { ChatConversation, ChatMessage } from "@/lib/dashboard/chatData";
import { AvatarIcon } from "@/components/ui/AvatarIcon";

export function DashboardChat({ conversations: initial }: { conversations: ChatConversation[] }) {
  const [conversations, setConversations] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id);
  const [draft, setDraft] = useState("");

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  function selectConversation(id: string) {
    setActiveId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      from: "me",
      text,
      time: "Now",
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, message], lastMessage: text } : c)),
    );
    setDraft("");
  }

  if (!active) {
    return <div className="dashboard-panel">No conversations yet.</div>;
  }

  return (
    <div className="chat-layout">
      <div className="chat-list">
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chat-list__item${c.id === active.id ? " is-active" : ""}`}
            onClick={() => selectConversation(c.id)}
          >
            <span className="chat-list__avatar">
              <AvatarIcon seed={c.id + c.withName} />
            </span>
            <span className="chat-list__meta">
              <span className="chat-list__name">{c.withName}</span>
              <span className="chat-list__last">{c.lastMessage}</span>
            </span>
            {c.unread > 0 && <span className="chat-list__badge">{c.unread}</span>}
          </button>
        ))}
      </div>

      <div className="chat-thread">
        <div className="chat-thread__head">
          <span className="chat-list__avatar">
            <AvatarIcon seed={active.id + active.withName} />
          </span>
          <div>
            <div className="chat-thread__name">{active.withName}</div>
            <div className="chat-thread__game">{active.gameName}</div>
          </div>
        </div>

        <div className="chat-thread__messages">
          {active.messages.map((m) => (
            <div key={m.id} className={`chat-bubble chat-bubble--${m.from}`}>
              <p>{m.text}</p>
              <span>{m.time}</span>
            </div>
          ))}
        </div>

        <form className="chat-thread__input" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" aria-label="Send">
            <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
