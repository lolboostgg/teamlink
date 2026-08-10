import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { AdminChatOverview, type AdminConversation } from "@/components/dashboard/admin/AdminChatOverview";
import { AdminTableToolbar } from "@/components/dashboard/admin/AdminTableToolbar";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Chat overview" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{ conversation?: string; q?: string; status?: string; page?: string }>;
};

/**
 * Every conversation, one page at a time.
 *
 * This page used to load every order that ever had a teammate — with its
 * customer and every selected candidate attached — and then build the thread
 * list in memory. At a hundred orders that is invisible; it also grows
 * monotonically, because a finished order never leaves the set. It was the
 * one query on the site with no bound at all.
 *
 * Now it reads one page of orders and only the messages belonging to that
 * page's threads. The message fetch was always scoped to the keys on screen,
 * so bounding the orders bounds both.
 */
export default async function AdminChatPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const status = params.status === "active" || params.status === "completed" ? params.status : undefined;

  const where: Prisma.OrderWhereInput = {
    AND: [
      { candidates: { some: { selected: true } } },
      ...(status ? [status === "completed" ? { status: "COMPLETED" as const } : { NOT: { status: "COMPLETED" as const } }] : []),
      ...(q
        ? [
            {
              OR: [
                // An order number is what an admin actually arrives with,
                // from a ticket or a Discord message.
                ...(/^#?\d+$/.test(q) ? [{ orderNo: Number.parseInt(q.replace("#", ""), 10) }] : []),
                { customerLabel: { contains: q, mode: "insensitive" as const } },
                { gameName: { contains: q, mode: "insensitive" as const } },
                { clientUser: { is: { email: { contains: q, mode: "insensitive" as const } } } },
                { clientUser: { is: { name: { contains: q, mode: "insensitive" as const } } } },
                {
                  candidates: {
                    some: { selected: true, teammate: { is: { name: { contains: q, mode: "insensitive" as const } } } },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const total = await prisma.order.count({ where });
  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);

  const orders = await prisma.order.findMany({
    where,
    include: { clientUser: true, candidates: { where: { selected: true }, include: { teammate: true } } },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const byKey = new Map<string, Omit<AdminConversation, "messages">>();
  for (const order of orders) {
    for (const candidate of order.candidates) {
      // One thread per order and teammate — same key the two sides write to
      // (see lib/matchmaking/chatStore.ts).
      const key = `${order.id}::${candidate.teammateId}`;
      if (!byKey.has(key))
        byKey.set(key, {
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

  const messages = byKey.size
    ? await prisma.conversationMessage.findMany({
        where: { conversationKey: { in: Array.from(byKey.keys()) } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const conversations: AdminConversation[] = Array.from(byKey.values()).map((conversation) => ({
    ...conversation,
    messages: messages
      .filter((message) => message.conversationKey === conversation.key)
      .map((message) => ({
        id: message.id,
        from: message.sender,
        text: message.text,
        createdAt: message.createdAt.getTime(),
      })),
  }));

  const hrefFor = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    next.set("page", String(nextPage));
    return `/dashboard/admin/chat?${next}`;
  };

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">All chats</div>
          <div className="dashboard-panel__sub">
            Client and teammate conversations &middot; {total} matching
          </div>
        </div>
      </div>

      <AdminTableToolbar
        initialQuery={q}
        placeholder="Search order no, customer, teammate or game…"
        searchLabel="Search conversations"
        filters={[
          {
            param: "status",
            value: status ?? "",
            options: [
              { value: "", label: "All chats", icon: "fa-solid fa-layer-group" },
              { value: "active", label: "Active", icon: "fa-solid fa-circle-play" },
              { value: "completed", label: "Completed", icon: "fa-solid fa-circle-check" },
            ],
          },
        ]}
      />

      {conversations.length === 0 ? (
        <div className="dashboard-empty">
          <i className="fa-solid fa-comments" aria-hidden="true" />
          <p>No conversations match.</p>
        </div>
      ) : (
        <AdminChatOverview conversations={conversations} initialKey={params.conversation} />
      )}

      <TablePagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        hrefFor={hrefFor}
        label="Chat pagination"
      />
    </div>
  );
}
