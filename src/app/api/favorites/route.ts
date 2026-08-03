import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireClient() {
  const session = await auth();
  return session?.user?.id && session.user.role === "CLIENT" ? session.user.id : null;
}

export async function GET() {
  const clientUserId = await requireClient();
  if (!clientUserId) return NextResponse.json({ favoriteIds: [] }, { status: 401 });
  const rows = await prisma.favoriteTeammate.findMany({
    where: { clientUserId },
    select: { teammateId: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ favoriteIds: rows.map((row) => row.teammateId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const clientUserId = await requireClient();
  if (!clientUserId) return NextResponse.json({ error: "Only clients can manage favorites." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { teammateId?: string; favorited?: boolean } | null;
  const teammateId = body?.teammateId?.slice(0, 100) ?? "";
  if (!teammateId || !(await prisma.teammate.findUnique({ where: { id: teammateId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Unknown teammate." }, { status: 400 });
  }
  if (body?.favorited === false) {
    await prisma.favoriteTeammate.deleteMany({ where: { clientUserId, teammateId } });
  } else {
    await prisma.favoriteTeammate.upsert({
      where: { clientUserId_teammateId: { clientUserId, teammateId } },
      create: { clientUserId, teammateId },
      update: {},
    });
  }
  return NextResponse.json({ ok: true });
}
