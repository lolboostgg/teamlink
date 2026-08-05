"use client";

import { useMemo } from "react";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { conversationKey } from "@/lib/matchmaking/chatStore";
import { DashboardChat } from "@/components/dashboard/chat/DashboardChat";
import type { ChatConversation } from "@/lib/dashboard/chatData";

// Inverse of ClientChatContent — one conversation per order this teammate
// played, newest first. Same real, shared message store
// (lib/matchmaking/chatStore.ts) as the in-session chat and the client's own
// dashboard chat tab. Orders are listed separately rather than merged per
// client: each booking is its own session, so its thread starts empty.
export function TeammateChatContent() {
  const orders = useAllOrders();
  const teammateId = useCurrentTeammateId();

  const conversations: ChatConversation[] = useMemo(() => {
    if (!teammateId) return [];
    return orders
      .filter((order) => order.selectedTeammateIds.includes(teammateId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((order) => ({
        id: order.id,
        withName: order.customerLabel,
        withAvatarUrl: order.customerAvatarUrl ?? null,
        gameName: order.gameName,
        conversationKey: conversationKey(order.id, teammateId),
        orderNo: order.orderNo,
        status: order.status === "completed" ? "completed" : "active",
        lockedAt:
          order.status === "completed" ? (order.sessionCompleteAt ?? order.createdAt) + 60 * 60 * 1000 : null,
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
