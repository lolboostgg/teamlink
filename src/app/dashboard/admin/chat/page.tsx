import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { AdminChatOverview, type AdminConversation } from "@/components/dashboard/admin/AdminChatOverview";

export const metadata: Metadata = { title: "Chat overview" };
export const dynamic = "force-dynamic";

export default async function AdminChatPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const { conversation } = await searchParams;
  const orders = await prisma.order.findMany({
    where: { candidates: { some: { selected: true } } },
    include: { clientUser: true, candidates: { where: { selected: true }, include: { teammate: true } } },
    orderBy: { createdAt: "desc" },
  });
  const byKey = new Map<string, Omit<AdminConversation, "messages">>();
  for (const order of orders) {
    for (const candidate of order.candidates) {
      const key = `${candidate.teammateId}::${order.customerLabel}`;
      if (!byKey.has(key)) byKey.set(key, {
        key,
        orderNo: order.orderNo,
        clientName: order.clientUser?.name || order.clientUser?.email || order.customerLabel,
        clientAvatarUrl: order.clientUser?.avatarUrl ?? null,
        teammateName: candidate.teammate.name,
        teammateAvatarUrl: candidate.teammate.avatarUrl,
        gameName: order.gameName,
        status: order.status === "COMPLETED" ? "completed" : "active",
      });
    }
  }
  const messages = byKey.size ? await prisma.conversationMessage.findMany({
    where: { conversationKey: { in: Array.from(byKey.keys()) } },
    orderBy: { createdAt: "asc" },
  }) : [];
  const conversations: AdminConversation[] = Array.from(byKey.values()).map((conversation) => ({
    ...conversation,
    messages: messages.filter((message) => message.conversationKey === conversation.key).map((message) => ({
      id: message.id, from: message.sender, text: message.text, createdAt: message.createdAt.getTime(),
    })),
  }));

  return <div className="dashboard-panel"><div className="dashboard-panel__head"><div><div className="dashboard-panel__title">All chats</div><div className="dashboard-panel__sub">Client and teammate conversations · {conversations.length} total</div></div></div><AdminChatOverview conversations={conversations} initialKey={conversation} /></div>;
}
