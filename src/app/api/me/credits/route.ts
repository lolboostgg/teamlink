import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ balanceCents: 0 });
  }
  if (session.user.role !== "CLIENT") {
    return NextResponse.json({ balanceCents: 0 }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { creditBalanceCents: true },
  });

  return NextResponse.json({ balanceCents: user?.creditBalanceCents ?? 0 });
}
