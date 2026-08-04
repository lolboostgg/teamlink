"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendChatMessage } from "@/lib/matchmaking/chatStore";

export function AdminOrderReply({ conversationKey, orderNo }: { conversationKey: string; orderNo: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendChatMessage(conversationKey, "admin", text);
    setDraft("");
    window.setTimeout(() => router.refresh(), 800);
  }
  return <form className="chat-thread__input admin-order-chat__input" onSubmit={send}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Reply as admin in order #${orderNo}…`} /><button type="submit" aria-label="Send as admin"><i className="fa-solid fa-paper-plane" /></button></form>;
}
