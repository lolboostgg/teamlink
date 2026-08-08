import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * "This dashboard is still open."
 *
 * The online switch says what a teammate *wants*; this says whether their
 * browser is still there. They are not the same thing, and only the switch
 * being real is not enough: somebody flips it on, shuts the laptop, and stays
 * online forever — dispatch keeps inviting them, nobody answers, and every
 * order they are picked for spends a wave finding that out.
 *
 * It used to be the full dispatch-state read on a timer, which meant several
 * queries per teammate per interval to write one timestamp. This is the write
 * on its own. The state read still happens, but only when the push channel
 * says something changed or the slow fallback comes round.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const now = new Date();
  // updateMany rather than a lookup and then an update: this runs on every
  // online teammate on a timer, and it has no business costing two queries.
  // A user with no teammate row simply matches nothing.
  await prisma.teammate.updateMany({
    where: { userId: session.user.id },
    data: { lastSeenAt: now },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
