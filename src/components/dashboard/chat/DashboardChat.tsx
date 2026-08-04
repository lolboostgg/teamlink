"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatConversation } from "@/lib/dashboard/chatData";
import { useConversationMessages, sendChatMessage, getLastMessage } from "@/lib/matchmaking/chatStore";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { useSession } from "next-auth/react";

interface Props {
  conversations: ChatConversation[];
  // Which side this dashboard belongs to — decides which stored messages
  // render as "me" vs "them" and who a sent message is attributed to.
  from: "client" | "teammate";
}

export function DashboardChat({ conversations, from }: Props) {
  const [activeId, setActiveId] = useState(conversations[0]?.id);
  const [draft, setDraft] = useState("");
  const { data: session } = useSession();
  const messagesRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const { messages, refresh } = useConversationMessages(active?.conversationKey);
  const readOnly = Boolean(active?.lockedAt && active.lockedAt <= Date.now());

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [active?.id, messages.length]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active || readOnly) return;
    sendChatMessage(active.conversationKey, from, text);
    refresh();
    setDraft("");
  }

  if (!active) {
    return <div className="dashboard-panel">No conversations yet.</div>;
  }

  return (
    <div className="chat-layout">
      <div className="chat-list">
        {conversations.map((c) => {
          const preview = getLastMessage(c.conversationKey);
          return (
            <button
              key={c.id}
              type="button"
              className={`chat-list__item${c.id === active.id ? " is-active" : ""}`}
              onClick={() => setActiveId(c.id)}
            >
              <span className="chat-list__avatar">
                <SafeAvatarImage src={c.withAvatarUrl} />
              </span>
              <span className="chat-list__meta">
                <span className="chat-list__name">{c.withName}{c.status === "completed" && <span className="chat-status-badge">Completed</span>}</span>
                <span className="chat-list__last">#{c.orderNo} · {preview ? preview.text : `Matched for ${c.gameName}`}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="chat-thread">
        <div className="chat-thread__head">
          <span className="chat-list__avatar">
            <SafeAvatarImage src={active.withAvatarUrl} />
          </span>
          <div className="chat-thread__identity">
            <div className="chat-thread__name">{active.withName}{active.status === "completed" && <span className="chat-status-badge">Completed</span>}</div>
            <div className="chat-thread__game">Order #{active.orderNo} · {active.gameName}</div>
          </div>
        </div>

        <div className="chat-thread__messages" ref={messagesRef}>
          {messages.length === 0 && (
            <p className="chat-thread__empty">No messages yet — say hello to get the conversation started.</p>
          )}
          {messages.map((m) => {
            const mine = m.from === from;
            const avatarUrl = mine ? session?.user?.image : active.withAvatarUrl;
            return <div key={m.id} className={`chat-message-row chat-message-row--${mine ? "me" : "them"}`}>
              {!mine && <span className="chat-message-row__avatar"><SafeAvatarImage src={avatarUrl} /></span>}
              <div className={`chat-bubble chat-bubble--${mine ? "me" : "them"}`}>
                <strong className="chat-bubble__sender">{mine ? (session?.user?.name || "You") : active.withName}</strong>
                <p>{m.text}</p>
                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {mine && <span className="chat-message-row__avatar"><SafeAvatarImage src={avatarUrl} /></span>}
            </div>
          })}
        </div>

        {readOnly ? (
          <div className="chat-thread__locked">
            <i className="fa-solid fa-lock" aria-hidden="true" />
            <span><strong>Conversation completed</strong>This chat is read only one hour after the session ended.</span>
          </div>
        ) : <form className="chat-thread__input" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" aria-label="Send">
            <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          </button>
        </form>}
      </div>
    </div>
  );
}
