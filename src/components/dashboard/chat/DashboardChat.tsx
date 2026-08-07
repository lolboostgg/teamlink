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

  // Two rAFs (not one) so this runs after the browser has actually laid out
  // the new message, not just after React committed it — one frame is often
  // still mid-layout and scrolls to the previous, shorter height. The
  // ResizeObserver catches everything else that changes the thread's height
  // late, e.g. an avatar image finishing its own load.
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
                <SafeAvatarImage src={c.withAvatarUrl} frame={c.withAvatarFrame} />
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
            <SafeAvatarImage src={active.withAvatarUrl} frame={active.withAvatarFrame} />
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
            const isAdmin = m.from === "admin";
            const mine = m.from === from;
            const avatarUrl = mine ? session?.user?.image : active.withAvatarUrl;
            // Only the other side's framing is known here — one's own picture
            // comes from the session, which carries the URL and nothing else.
            const avatarFrame = mine ? null : active.withAvatarFrame;
            return <div key={m.id} className={`chat-message-row chat-message-row--${isAdmin ? "admin" : mine ? "me" : "them"}`}>
              {!mine && (isAdmin ? <span className="chat-message-row__avatar chat-message-row__avatar--admin"><i className="fa-solid fa-shield-halved" /></span> : <span className="chat-message-row__avatar"><SafeAvatarImage src={avatarUrl} frame={avatarFrame} /></span>)}
              <div className={`chat-bubble chat-bubble--${mine ? "me" : "them"}`}>
                <strong className="chat-bubble__sender">{isAdmin ? "Admin" : mine ? (session?.user?.name || "You") : active.withName}</strong>
                <p>{m.text}</p>
                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {mine && <span className="chat-message-row__avatar"><SafeAvatarImage src={avatarUrl} frame={avatarFrame} /></span>}
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
