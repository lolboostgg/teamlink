import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { assertAssignedTeammate, DispatchError } from "@/lib/dispatch/service";
import { payoutForOrder } from "@/lib/payoutSplit";

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
    include: { games: { orderBy: { gameNumber: "asc" } }, candidates: { include: { teammate: { select: { name: true, sessionsCount: true, avatarUrl: true } } } }, clientUser: true },
  });
  if (!order) return NextResponse.json({ error: "Unknown order." }, { status: 404 });

  return NextResponse.json(
    {
      id: order.id,
      teammateId:
        order.candidates.find((c) => c.selected && c.isPrimary)?.teammateId ??
        order.candidates.find((c) => c.selected)?.teammateId ??
        null,
      gameSlug: order.gameSlug,
      gameName: order.gameName,
      option: order.option,
      priceEUR: Number(order.priceEUR),
      payoutEUR: payoutForOrder(order),
      customerLabel: order.clientUser?.name || order.clientUser?.email || order.customerLabel,
      teammateName: order.candidates.find((c) => c.selected)?.teammate.name ?? null,
      teammatesRequested: order.teammatesRequested,
      gamesBooked: order.gamesBooked,
      vibe: order.vibe,
      conversationPref: order.conversationPref,
      playStylePref: order.playStylePref,
      status: order.status,
      sessionStatus: order.sessionStatus,
      assignedAt: order.assignedAt?.getTime() ?? null,
      teammateCompletedSessions: order.candidates.find((c) => c.selected)?.teammate.sessionsCount ?? 0,
      teammateAvatarUrl: order.candidates.find((c) => c.selected)?.teammate.avatarUrl ?? null,
      customerAvatarUrl: order.clientUser?.avatarUrl ?? null,
      games: order.games.map((g) => ({
        gameNumber: g.gameNumber,
        result: g.result,
        note: g.note,
        proofPath: g.proofPath,
        proofName: g.proofName,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
