"use client";

import { useMemo } from "react";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { conversationKey } from "@/lib/matchmaking/chatStore";
import { DashboardChat } from "@/components/dashboard/chat/DashboardChat";
import type { ChatConversation } from "@/lib/dashboard/chatData";

// Inverse of ClientChatContent — one conversation per real client this
// teammate has actually been matched with, most recent first. Same real,
// shared message store (lib/matchmaking/chatStore.ts) as the in-session
// chat and the client's own dashboard chat tab.
export function TeammateChatContent() {
  const orders = useAllOrders();
  const teammateId = useCurrentTeammateId();

  const conversations: ChatConversation[] = useMemo(() => {
    const byClient = new Map<string, { gameName: string; createdAt: number }>();
    orders.forEach((order) => {
      if (!teammateId || !order.selectedTeammateIds.includes(teammateId)) return;
      const existing = byClient.get(order.customerLabel);
      if (!existing || order.createdAt > existing.createdAt) {
        byClient.set(order.customerLabel, { gameName: order.gameName, createdAt: order.createdAt });
      }
    });

    return Array.from(byClient.entries())
      .sort((a, b) => b[1].createdAt - a[1].createdAt)
      .map(([client, info], i) => ({
        id: `${client}-${i}`,
        withName: client,
        gameName: info.gameName,
        conversationKey: teammateId ? conversationKey(teammateId, client) : "",
      }));
  }, [orders, teammateId]);

  if (conversations.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-comment-slash" aria-hidden="true" />
        <p>No conversations yet — chat opens once you&rsquo;re matched with a client.</p>
      </div>
    );
  }

  return <DashboardChat conversations={conversations} from="teammate" />;
}
