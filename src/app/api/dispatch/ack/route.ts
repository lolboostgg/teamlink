import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * "The alert is on my screen."
 *
 * A teammate who never answers a wave should slide down the priority list —
 * but only if the alert actually reached them. Someone whose connection
 * dropped, whose tab was asleep, or whose stream never reconnected did not
 * ignore anything, and punishing that would push exactly the people with the
 * worst connections out of the roster.
 *
 * So the browser confirms receipt, and the timestamp that lands here is what
 * separates a miss from a delivery failure. Nothing else depends on it — an
 * unacknowledged alert is still live and can still be accepted.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teammate) return NextResponse.json({ ok: false }, { status: 403 });

  const { orderId } = (await request.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId) return NextResponse.json({ ok: false }, { status: 400 });

  // updateMany, not update: a second confirmation for the same alert should
  // be a no-op, not a 404. `deliveredAt: null` keeps the first one — what
  // matters is when it first arrived.
  await prisma.dispatchCandidate.updateMany({
    where: { orderId, teammateId: teammate.id, status: "PENDING", deliveredAt: null },
    data: { deliveredAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
