"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import {
  markConversationRead,
  sendChatMessage,
  setChatTyping,
  useChatTyping,
  useConversationMessages,
} from "@/lib/matchmaking/chatStore";
import { AvatarIcon } from "@/components/ui/AvatarIcon";

interface SystemLine {
  id: string;
  text: string;
}

interface Props {
  conversationKey: string;
  teammateName: string;
  customerName?: string;
  viewer?: "client" | "teammate";
  vibe?: string | null;
  conversationPref?: string | null;
  playStylePref?: string | null;
}

const QUICK_REPLIES = ["Hello", "Okay", "Waiting for invite", "Thank you", "GG", "On the way", "Logging in..."];

// Real, persisted thread (see lib/matchmaking/chatStore.ts) — the same
// conversation the client's dashboard "Chat" tab shows, not a separate
// local-only thread that disappears on reload. The intro/preferences
// notices stay client-only decoration (system lines, not real messages)
// since they're generated from this order's own settings, not something
// either side actually typed.
export function SessionChat({
  conversationKey,
  teammateName,
  customerName = "Customer",
  viewer = "client",
  vibe,
  conversationPref,
  playStylePref,
}: Props) {
  const { messages, refresh } = useConversationMessages(conversationKey);
  const [draft, setDraft] = useState("");
  const seededRef = useRef(false);
  const otherSide = viewer === "client" ? "teammate" : "client";
  const otherTyping = useChatTyping(conversationKey, otherSide);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    });
    const observer = new ResizeObserver(() => {
      element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      observer.disconnect();
    };
  }, [messages.length, otherTyping]);

  useEffect(() => {
    markConversationRead(conversationKey, viewer);
  }, [conversationKey, messages, viewer]);

  useEffect(() => () => setChatTyping(conversationKey, viewer, false), [conversationKey, viewer]);

  // Seeds the teammate's opening line into the real store once per
  // conversation (not on every mount) so it's part of the same persisted
  // thread the dashboard chat reads, instead of purely decorative.
  useEffect(() => {
    if (seededRef.current || messages.length > 0) return;
    seededRef.current = true;
    sendChatMessage(conversationKey, "teammate", `Hi! This is ${teammateName} — ready when you are.`);
    // BroadcastChannel never delivers a message back to the tab that sent
    // it, so this tab's own subscription won't fire on its own write —
    // refresh() closes that gap for the sender specifically.
    refresh();
  }, [conversationKey, teammateName, messages.length, refresh]);

  const systemLines: SystemLine[] = [];
  if (vibe) systemLines.push({ id: "sys-vibe", text: `Vibe set: ${vibe.charAt(0).toUpperCase()}${vibe.slice(1)}` });
  if (conversationPref || playStylePref) {
    const lines = ["My preferences are,"];
    if (conversationPref) lines.push(`Conversation: ${conversationPref}`);
    if (playStylePref) lines.push(`Play style: ${playStylePref}`);
    systemLines.push({ id: "sys-prefs", text: lines.join("\n") });
  }

  function sendText(text: string) {
    sendChatMessage(conversationKey, viewer, text);
    setChatTyping(conversationKey, viewer, false);
    refresh();
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendText(trimmed);
    setDraft("");
  }

  return (
    <div className="session-chat">
      <div ref={messagesRef} className="chat-thread__messages session-chat__messages">
        <div className="chat-bubble chat-bubble--system">
          <p>
            You&rsquo;ll receive a message from {teammateName} now, so please don&rsquo;t close this chat. Let them know how
            you&rsquo;d like to play and your goals (default is to win).
          </p>
        </div>
        {systemLines.map((line) => (
          <div key={line.id} className="chat-bubble chat-bubble--system">
            {line.text.split("\n").map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        ))}
        {messages.map((m) => (
          <div key={m.id} className={`chat-message chat-message--${m.from === viewer ? "me" : "them"}`}>
            <AvatarIcon seed={`${conversationKey}-${m.from}`} />
            <div className={`chat-bubble chat-bubble--${m.from === viewer ? "me" : "them"}`}>
              <strong className="chat-bubble__sender">{m.from === "client" ? customerName : teammateName}</strong>
              <p>{m.text}</p>
              <span>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {m.from === viewer && (m.readBy?.includes(otherSide) ? " · Read" : " · Sent")}
              </span>
            </div>
          </div>
        ))}
        {otherTyping && (
          <div className="chat-typing" role="status">
            <AvatarIcon seed={`${conversationKey}-${otherSide}`} />
            <span><i /><i /><i /></span>
            {otherSide === "client" ? customerName : teammateName} is typing…
          </div>
        )}
      </div>

      <div className="session-chat__quick-replies">
        {QUICK_REPLIES.map((reply) => (
          <button key={reply} type="button" className="session-chat__quick-reply" onClick={() => sendText(reply)}>
            {reply}
          </button>
        ))}
      </div>

      <form className="chat-thread__input" onSubmit={send}>
        <input
          type="text"
          placeholder="Enter message"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setChatTyping(conversationKey, viewer, e.target.value.trim().length > 0);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setChatTyping(conversationKey, viewer, false), 1600);
          }}
        />
        <button type="submit" aria-label="Send">
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
