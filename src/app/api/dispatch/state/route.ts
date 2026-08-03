import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getTeammateDispatchView, MAX_CANDIDATES } from "@/lib/dispatch/service";
import { deriveServerPhase } from "@/lib/dispatch/phase";

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
  if (!teammate.lastSeenAt || now.getTime() - teammate.lastSeenAt.getTime() >= 15_000) {
    await prisma.teammate.update({
      where: { id: teammate.id },
      data: {
        lastSeenAt: now,
        ...(teammate.available && !teammate.availableSince ? { availableSince: now } : {}),
      },
    });
  }

  const rows = await getTeammateDispatchView(teammate.id);
  const view = deriveServerPhase(rows, teammate.available);

  return NextResponse.json({ ...view, maxCandidates: MAX_CANDIDATES }, { headers: { "Cache-Control": "no-store" } });
}
