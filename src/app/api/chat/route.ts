import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/events/bus";

export const dynamic = "force-dynamic";

type ChatSide = "client" | "teammate" | "admin";
const globalPresence = globalThis as typeof globalThis & { teamlinkChatTyping?: Map<string, Partial<Record<ChatSide, number>>> };
const typingPresence = globalPresence.teamlinkChatTyping ??= new Map();

interface ConversationAccess {
  /** Which side the reader is *on this order* — null when they aren't on it at all. */
  side: ChatSide | null;
  locked: boolean;
  orderId: string;
  teammateId: string;
}

const NO_ACCESS: ConversationAccess = { side: null, locked: false, orderId: "", teammateId: "" };

/**
 * Resolves who the caller is in this conversation.
 *
 * The side is derived from the order's own rows, never from the account's
 * global role: a teammate can also book sessions as a customer, and reading
 * `user.role` meant their own bookings were rejected as "not your chat" —
 * their messages stayed in their browser and never reached the other side.
 * Being the order's client wins, so a teammate booking someone else writes
 * as the customer they are on that order.
 */
async function conversationAccess(userId: string, role: string, key: string): Promise<ConversationAccess> {
  const separator = key.indexOf("::");
  const orderId = separator > 0 ? key.slice(0, separator) : "";
  const teammateId = separator > 0 ? key.slice(separator + 2) : "";
  if (!orderId || !teammateId) return NO_ACCESS;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      clientUserId: true,
      status: true,
      sessionCompleteAt: true,
      createdAt: true,
      candidates: {
        where: { selected: true },
        select: { teammateId: true, teammate: { select: { userId: true } } },
      },
    },
  });
  const candidate = order?.candidates.find((c) => c.teammateId === teammateId);
  if (!order || !candidate) return NO_ACCESS;

  const side: ChatSide | null =
    order.clientUserId && order.clientUserId === userId
      ? "client"
      : candidate.teammate.userId === userId
        ? "teammate"
        : role === "ADMIN"
          ? "admin"
          : null;

  const lockedAt =
    order.status === "COMPLETED" ? (order.sessionCompleteAt ?? order.createdAt).getTime() + 60 * 60 * 1000 : null;
  return { side, locked: Boolean(lockedAt && lockedAt <= Date.now()), orderId, teammateId };
}

/**
 * Everyone allowed to see a conversation: the client, the teammates actually
 * on the order, and every admin. Used to address change events — a chat
 * signal must not fan out to unrelated accounts, since the key itself
 * identifies an order.
 */
async function conversationAudience(orderId: string): Promise<string[]> {
  if (!orderId) return [];

  const [order, admins] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      select: {
        clientUserId: true,
        candidates: { where: { selected: true }, select: { teammate: { select: { userId: true } } } },
      },
    }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
  ]);

  const ids = new Set<string>(admins.map((admin) => admin.id));
  if (order?.clientUserId) ids.add(order.clientUserId);
  for (const candidate of order?.candidates ?? []) {
    if (candidate.teammate.userId) ids.add(candidate.teammate.userId);
  }
  return [...ids];
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = request.nextUrl.searchParams.get("key")?.slice(0, 300) ?? "";
  const access = key ? await conversationAccess(session.user.id, session.user.role, key) : NO_ACCESS;
  if (!access.side) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const messages = await prisma.conversationMessage.findMany({
    where: { conversationKey: key },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      conversationKey: message.conversationKey,
      from: message.sender,
      text: message.text,
      createdAt: message.createdAt.getTime(),
      readBy: message.readBy,
    })),
    typing: Object.fromEntries(Object.entries(typingPresence.get(key) ?? {}).filter(([, until]) => typeof until === "number" && until > Date.now())),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { key?: string; action?: "typing" | "read"; typing?: boolean } | null;
  const key = body?.key?.slice(0, 300) ?? "";
  const access = key ? await conversationAccess(session.user.id, session.user.role, key) : NO_ACCESS;
  const side = access.side;
  if (!side) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (body?.action === "typing") {
    typingPresence.set(key, { ...typingPresence.get(key), [side]: body.typing ? Date.now() + 3_500 : 0 });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "read") {
    const unread = await prisma.conversationMessage.findMany({ where: { conversationKey: key, sender: { not: side } }, select: { id: true, readBy: true } });
    await prisma.$transaction(unread.flatMap((message) => {
      const readBy = Array.isArray(message.readBy) ? message.readBy.filter((value): value is string => typeof value === "string") : [];
      return readBy.includes(side) ? [] : [prisma.conversationMessage.update({ where: { id: message.id }, data: { readBy: [...readBy, side] } })];
    }));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string; key?: string; text?: string; createdAt?: number } | null;
  const key = body?.key?.slice(0, 300) ?? "";
  const text = body?.text?.trim().slice(0, 4000) ?? "";
  const access = key ? await conversationAccess(session.user.id, session.user.role, key) : NO_ACCESS;
  const sender = access.side;
  if (!text || !sender) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  if (access.locked) return NextResponse.json({ error: "This conversation is read only." }, { status: 423 });
  const suppliedId = body?.id && /^msg-[a-zA-Z0-9-]{6,100}$/.test(body.id) ? body.id : undefined;
  const data = {
    conversationKey: key,
    sender,
    text,
    readBy: [sender],
    ...(Number.isFinite(body?.createdAt) ? { createdAt: new Date(body!.createdAt!) } : {}),
  };
  const message = suppliedId
    ? await prisma.conversationMessage.upsert({
        where: { id: suppliedId },
        create: { id: suppliedId, ...data },
        update: {},
      })
    : await prisma.conversationMessage.create({ data });
  // Everyone with this conversation open gets it now, not on the next poll.
  await publish({ topic: "chat", key, userIds: await conversationAudience(access.orderId) });
  return NextResponse.json({ id: message.id, createdAt: message.createdAt.getTime() });
}
