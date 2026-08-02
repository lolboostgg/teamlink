"use client";

import { useState, type FormEvent } from "react";

interface Message {
  id: string;
  from: "me" | "them" | "system";
  text: string;
  time: string;
}

interface Props {
  teammateName: string;
}

// Local-only thread (no persistence, same as the generic DashboardChat) —
// seeded with a system notice + a first hello from the teammate so the
// screen doesn't open on an empty box.
export function SessionChat({ teammateName }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "sys-1",
      from: "system",
      text: `You'll receive a message from ${teammateName} now, so please don't close this chat. Let them know how you'd like to play and your goals (default is to win).`,
      time: "Now",
    },
    {
      id: "them-1",
      from: "them",
      text: `Hi! This is ${teammateName} — ready when you are.`,
      time: "Now",
    },
  ]);
  const [draft, setDraft] = useState("");

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: `me-${Date.now()}`, from: "me", text, time: "Now" }]);
    setDraft("");
  }

  return (
    <div className="session-chat">
      <div className="session-chat__notice">
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        If you want to voice chat, {teammateName} will invite you to Discord shortly. Contact support if you run into
        any issues.
      </div>

      <div className="chat-thread__messages session-chat__messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-bubble chat-bubble--${m.from === "me" ? "me" : "them"}${m.from === "system" ? " chat-bubble--system" : ""}`}
          >
            <p>{m.text}</p>
            <span>{m.time}</span>
          </div>
        ))}
      </div>

      <form className="chat-thread__input" onSubmit={send}>
        <input type="text" placeholder="Enter message" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" aria-label="Send">
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
