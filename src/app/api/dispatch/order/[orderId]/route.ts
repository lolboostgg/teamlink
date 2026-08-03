import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { assertAssignedTeammate, DispatchError } from "@/lib/dispatch/service";

export const dynamic = "force-dynamic";

/** One order, readable only by the teammate it was assigned to (or an admin). */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (session.user.role !== "ADMIN") {
    const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
    if (!teammate) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    try {
      await assertAssignedTeammate(orderId, teammate.id);
    } catch (err) {
      const message = err instanceof DispatchError ? err.message : "Forbidden.";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { games: { orderBy: { gameNumber: "asc" } } },
  });
  if (!order) return NextResponse.json({ error: "Unknown order." }, { status: 404 });

  return NextResponse.json(
    {
      id: order.id,
      gameSlug: order.gameSlug,
      gameName: order.gameName,
      option: order.option,
      priceEUR: Number(order.priceEUR),
      payoutEUR: order.teammatePayoutEUR !== null ? Number(order.teammatePayoutEUR) : Number(order.priceEUR),
      customerLabel: order.customerLabel,
      teammatesRequested: order.teammatesRequested,
      vibe: order.vibe,
      conversationPref: order.conversationPref,
      playStylePref: order.playStylePref,
      status: order.status,
      sessionStatus: order.sessionStatus,
      assignedAt: order.assignedAt?.getTime() ?? null,
      games: order.games.map((g) => ({
        gameNumber: g.gameNumber,
        result: g.result,
        note: g.note,
        proofPath: g.proofPath,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
