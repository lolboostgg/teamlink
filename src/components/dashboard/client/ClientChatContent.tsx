"use client";

import { useMemo } from "react";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { getTeammateById } from "@/lib/teammates";
import { DashboardChat } from "@/components/dashboard/chat/DashboardChat";
import type { ChatConversation } from "@/lib/dashboard/chatData";

// One conversation per real matched teammate (any order with a
// selectedTeammateId), most recently matched first — not a static mock
// list. Message content itself isn't persisted anywhere (same as the
// in-session chat), so each thread just seeds a short greeting.
export function ClientChatContent() {
  const orders = useAllOrders();

  const conversations: ChatConversation[] = useMemo(() => {
    const byTeammate = new Map<string, { gameName: string; createdAt: number }>();
    orders.forEach((order) => {
      if (!order.selectedTeammateId) return;
      const existing = byTeammate.get(order.selectedTeammateId);
      if (!existing || order.createdAt > existing.createdAt) {
        byTeammate.set(order.selectedTeammateId, { gameName: order.gameName, createdAt: order.createdAt });
      }
    });

    return Array.from(byTeammate.entries())
      .sort((a, b) => b[1].createdAt - a[1].createdAt)
      .map(([teammateId, info]) => {
        const name = getTeammateById(teammateId)?.name ?? "Teammate";
        return {
          id: teammateId,
          withName: name,
          gameName: info.gameName,
          lastMessage: `Matched for ${info.gameName}`,
          unread: 0,
          messages: [{ id: "m1", from: "them" as const, text: `Hi! Ready when you are for ${info.gameName}.`, time: "" }],
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

  return <DashboardChat conversations={conversations} />;
}
