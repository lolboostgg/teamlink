import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function canAccessConversation(userId: string, role: string, key: string) {
  if (role === "ADMIN") return true;
  const teammateId = key.split("::", 1)[0];
  if (!teammateId) return false;
  if (role === "TEAMMATE") {
    return Boolean(await prisma.teammate.findFirst({ where: { id: teammateId, userId }, select: { id: true } }));
  }
  return Boolean(await prisma.order.findFirst({
    where: { clientUserId: userId, candidates: { some: { teammateId, selected: true } } },
    select: { id: true },
  }));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = request.nextUrl.searchParams.get("key")?.slice(0, 300) ?? "";
  if (!key || !(await canAccessConversation(session.user.id, session.user.role, key))) {
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
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string; key?: string; from?: string; text?: string; createdAt?: number } | null;
  const key = body?.key?.slice(0, 300) ?? "";
  const text = body?.text?.trim().slice(0, 4000) ?? "";
  const sender = body?.from === "teammate" ? "teammate" : "client";
  if (!key || !text || !(await canAccessConversation(session.user.id, session.user.role, key))) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
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
