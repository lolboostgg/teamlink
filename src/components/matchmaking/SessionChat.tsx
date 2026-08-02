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
  vibe?: string | null;
  conversationPref?: string | null;
  playStylePref?: string | null;
}

const QUICK_REPLIES = ["Hello", "Okay", "Waiting for invite", "Thank you", "GG", "On the way", "Logging in..."];

// Local-only thread (no persistence, same as the generic DashboardChat) —
// seeded with a system notice, the preferences set during search (if any),
// and a first hello from the teammate so the screen doesn't open empty.
export function SessionChat({ teammateName, vibe, conversationPref, playStylePref }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const seed: Message[] = [
      {
        id: "sys-1",
        from: "system",
        text: `You'll receive a message from ${teammateName} now, so please don't close this chat. Let them know how you'd like to play and your goals (default is to win).`,
        time: "Now",
      },
    ];
    if (vibe) {
      seed.push({ id: "sys-vibe", from: "system", text: `Vibe set: ${vibe.charAt(0).toUpperCase()}${vibe.slice(1)}`, time: "Now" });
    }
    if (conversationPref || playStylePref) {
      const lines = ["My preferences are,"];
      if (conversationPref) lines.push(`Conversation: ${conversationPref}`);
      if (playStylePref) lines.push(`Play style: ${playStylePref}`);
      seed.push({ id: "me-prefs", from: "me", text: lines.join("\n"), time: "Now" });
    }
    seed.push({ id: "them-1", from: "them", text: `Hi! This is ${teammateName} — ready when you are.`, time: "Now" });
    return seed;
  });
  const [draft, setDraft] = useState("");

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: `me-${Date.now()}-${Math.random()}`, from: "me", text: trimmed, time: "Now" }]);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    sendText(draft);
    setDraft("");
  }

  return (
    <div className="session-chat">
      <div className="chat-thread__messages session-chat__messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-bubble chat-bubble--${m.from === "me" ? "me" : "them"}${m.from === "system" ? " chat-bubble--system" : ""}`}
          >
            {m.text.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <span>{m.time}</span>
          </div>
        ))}
      </div>

      <div className="session-chat__quick-replies">
        {QUICK_REPLIES.map((reply) => (
          <button key={reply} type="button" className="session-chat__quick-reply" onClick={() => sendText(reply)}>
            {reply}
          </button>
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
