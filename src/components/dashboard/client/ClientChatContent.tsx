"use client";

import { useMemo } from "react";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { getTeammateById } from "@/lib/teammates";
import { conversationKey } from "@/lib/matchmaking/chatStore";
import { DashboardChat } from "@/components/dashboard/chat/DashboardChat";
import type { ChatConversation } from "@/lib/dashboard/chatData";

// One conversation per booked session — every order that reached a teammate,
// newest first, and one thread per teammate on a multi-teammate order. Two
// bookings with the same teammate stay two separate threads: a session ends,
// and the next one starts from an empty chat. Messages themselves are real
// (see lib/matchmaking/chatStore.ts): the same conversation the in-session
// chat writes to.
export function ClientChatContent() {
  const orders = useAllOrders();

  const conversations: ChatConversation[] = useMemo(
    () =>
      [...orders]
        .sort((a, b) => b.createdAt - a.createdAt)
        .flatMap((order) =>
          order.selectedTeammateIds.map((teammateId) => ({
            id: `${order.id}-${teammateId}`,
            withName: getTeammateById(teammateId)?.name ?? "Teammate",
            withAvatarUrl: getTeammateById(teammateId)?.avatarUrl ?? null,
            gameName: order.gameName,
            conversationKey: conversationKey(order.id, teammateId),
            orderNo: order.orderNo,
            status: (order.status === "completed" ? "completed" : "active") as "active" | "completed",
            lockedAt:
              order.status === "completed" ? (order.sessionCompleteAt ?? order.createdAt) + 60 * 60 * 1000 : null,
          })),
        ),
    [orders],
  );

  if (conversations.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-comment-slash" aria-hidden="true" />
        <p>No conversations yet — chat opens once you&rsquo;re matched with a teammate.</p>
      </div>
    );
  }

  return <DashboardChat conversations={conversations} from="client" />;
}
