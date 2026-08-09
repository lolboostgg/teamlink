import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markTeammatePresent } from "@/lib/dispatch/presence";

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

  // Still one statement for a panel that has been open all along — see
  // markTeammatePresent. It also restarts the wait clock for a panel that has
  // been away, so closing the page and coming back does not present the
  // teammate with the hours they spent not being there.
  await markTeammatePresent(session.user.id, new Date());

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
