import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getTeammateDispatchView, MAX_CANDIDATES } from "@/lib/dispatch/service";
import { deriveServerPhase } from "@/lib/dispatch/phase";
import { presenceUpdate, PRESENCE_WRITE_EVERY_MS } from "@/lib/dispatch/presence";

export const dynamic = "force-dynamic";

/**
 * The teammate dashboard's single read. Returns the derived phase plus only
 * the data that phase is allowed to show — a waiting candidate learns how
 * many others accepted, never who they are.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
  if (!teammate) return NextResponse.json({ phase: "OFFLINE", order: null });

  const now = new Date();
  // The live poll doubles as a throttled panel heartbeat. This distinguishes
  // a genuinely open panel from an account whose online toggle was left on.
  //
  // Throttled, but the decision itself is made from the row we already hold,
  // so noticing that the panel was away costs nothing. It has to be made here
  // as well as in the heartbeat endpoint: both fire when the dashboard mounts,
  // and whichever the server sees first is the one that has to catch it.
  let availableSince = teammate.availableSince;
  if (!teammate.lastSeenAt || now.getTime() - teammate.lastSeenAt.getTime() >= PRESENCE_WRITE_EVERY_MS) {
    const data = presenceUpdate(teammate, now);
    await prisma.teammate.update({ where: { id: teammate.id }, data });
    // Read back from what we just wrote, not from the row as it was loaded:
    // the poll that notices the panel is back is the same poll that has to
    // report the restarted clock, or it shows the old figure once more first.
    if (data.availableSince) availableSince = data.availableSince;
  }

  const rows = await getTeammateDispatchView(teammate.id);
  const view = deriveServerPhase(rows, teammate.available);

  // What the idle panel counts from. Not the whole online session: somebody
  // who has been logged in for six hours and just finished an order has not
  // been waiting six hours, and a clock that says otherwise turns "time
  // waiting" into "time the tab was open" — which is neither what the
  // teammate wants to know nor what the dispatcher rewards.
  const waitingSince = [availableSince, teammate.lastAssignedAt]
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  // serverNow is what it counts against — a browser clock a few minutes out
  // would otherwise show a teammate who just went online as having waited an
  // hour.
  return NextResponse.json(
    {
      ...view,
      maxCandidates: MAX_CANDIDATES,
      waitingSince: waitingSince?.getTime() ?? null,
      serverNow: now.getTime(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
