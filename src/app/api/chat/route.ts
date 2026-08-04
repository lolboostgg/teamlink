import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ChatSide = "client" | "teammate" | "admin";
const globalPresence = globalThis as typeof globalThis & { teamlinkChatTyping?: Map<string, Partial<Record<ChatSide, number>>> };
const typingPresence = globalPresence.teamlinkChatTyping ??= new Map();

async function conversationAccess(userId: string, role: string, key: string) {
  if (role === "ADMIN") return { allowed: true, locked: false };
  const separator = key.indexOf("::");
  const teammateId = separator > 0 ? key.slice(0, separator) : "";
  const customerLabel = separator > 0 ? key.slice(separator + 2) : "";
  if (!teammateId || !customerLabel) return { allowed: false, locked: false };
  const order = await prisma.order.findFirst({
    where: {
      customerLabel,
      ...(role === "TEAMMATE"
        ? { candidates: { some: { teammateId, selected: true, teammate: { userId } } } }
        : { clientUserId: userId, candidates: { some: { teammateId, selected: true } } }),
    },
    orderBy: { createdAt: "desc" },
    select: { status: true, sessionCompleteAt: true, createdAt: true },
  });
  const lockedAt = order?.status === "COMPLETED"
    ? (order.sessionCompleteAt ?? order.createdAt).getTime() + 60 * 60 * 1000
    : null;
  return { allowed: Boolean(order), locked: Boolean(lockedAt && lockedAt <= Date.now()) };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = request.nextUrl.searchParams.get("key")?.slice(0, 300) ?? "";
  const access = key ? await conversationAccess(session.user.id, session.user.role, key) : { allowed: false };
  if (!key || !access.allowed) {
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
  const body = await request.json().catch(() => null) as { key?: string; action?: "typing" | "read"; side?: ChatSide; typing?: boolean } | null;
  const key = body?.key?.slice(0, 300) ?? "";
  const side: ChatSide = body?.side === "admin" ? "admin" : body?.side === "teammate" ? "teammate" : "client";
  const access = key ? await conversationAccess(session.user.id, session.user.role, key) : { allowed: false };
  const correctSide = (session.user.role === "CLIENT" && side === "client") || (session.user.role === "TEAMMATE" && side === "teammate") || (session.user.role === "ADMIN" && side === "admin");
  if (!key || !access.allowed || !correctSide) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  const body = (await request.json().catch(() => null)) as { id?: string; key?: string; from?: string; text?: string; createdAt?: number } | null;
  const key = body?.key?.slice(0, 300) ?? "";
  const text = body?.text?.trim().slice(0, 4000) ?? "";
  const sender = body?.from === "admin" ? "admin" : body?.from === "teammate" ? "teammate" : "client";
  const access = key ? await conversationAccess(session.user.id, session.user.role, key) : { allowed: false, locked: false };
  const correctSender = (session.user.role === "CLIENT" && sender === "client") || (session.user.role === "TEAMMATE" && sender === "teammate") || (session.user.role === "ADMIN" && sender === "admin");
  if (!key || !text || !access.allowed || !correctSender) {
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
  return NextResponse.json({ id: message.id, createdAt: message.createdAt.getTime() });
}
