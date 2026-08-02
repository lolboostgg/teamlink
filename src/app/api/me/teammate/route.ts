import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Resolves the signed-in account's own Teammate.id — the teammate-side
// dispatch views (incoming invites, active sessions, reviews, chat) all
// need this to know "which rows in the matchmaking store are mine" instead
// of assuming a single hardcoded demo identity (see
// lib/matchmaking/useCurrentTeammateId.ts).
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "TEAMMATE" || !session.user.id) {
    return NextResponse.json({ teammateId: null });
  }

  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  return NextResponse.json({ teammateId: teammate?.id ?? null });
}
