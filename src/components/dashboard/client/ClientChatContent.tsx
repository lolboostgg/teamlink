"use client";

import { useMemo } from "react";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { getTeammateById } from "@/lib/teammates";
import { conversationKey } from "@/lib/matchmaking/chatStore";
import { DashboardChat } from "@/components/dashboard/chat/DashboardChat";
import type { ChatConversation } from "@/lib/dashboard/chatData";

// One conversation per real matched teammate (any order with a
// selectedTeammateId), most recently matched first — not a static mock
// list. Messages themselves are real too now (see lib/matchmaking/
// chatStore.ts): the same conversation the in-session chat writes to.
export function ClientChatContent() {
  const orders = useAllOrders();

  const conversations: ChatConversation[] = useMemo(() => {
    const byTeammate = new Map<string, { orderNo: number; gameName: string; createdAt: number; customerLabel: string; status: "active" | "completed"; lockedAt: number | null }>();
    orders.forEach((order) => {
      if (!order.selectedTeammateId) return;
      const existing = byTeammate.get(order.selectedTeammateId);
      if (!existing || order.createdAt > existing.createdAt) {
        byTeammate.set(order.selectedTeammateId, {
          gameName: order.gameName,
          orderNo: order.orderNo,
          createdAt: order.createdAt,
          customerLabel: order.customerLabel,
          status: order.status === "completed" ? "completed" : "active",
          lockedAt: order.status === "completed" ? (order.sessionCompleteAt ?? order.createdAt) + 60 * 60 * 1000 : null,
        });
      }
    });

    return Array.from(byTeammate.entries())
      .sort((a, b) => b[1].createdAt - a[1].createdAt)
      .map(([teammateId, info]) => {
        const name = getTeammateById(teammateId)?.name ?? "Teammate";
        return {
          id: teammateId,
          withName: name,
          withAvatarUrl: getTeammateById(teammateId)?.avatarUrl ?? null,
          gameName: info.gameName,
          conversationKey: conversationKey(teammateId, info.customerLabel),
          orderNo: info.orderNo,
          status: info.status,
          lockedAt: info.lockedAt,
        };
      });
  }, [orders]);

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
