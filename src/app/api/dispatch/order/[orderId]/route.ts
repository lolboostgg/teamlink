import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { assertAssignedTeammate, DispatchError } from "@/lib/dispatch/service";
import { payoutForOrder } from "@/lib/payoutSplit";
import type { AvatarFrame } from "@/lib/avatarFrame";

export const dynamic = "force-dynamic";

/** Just the framing, off a row that also holds things this response must not carry. */
function frameOf(row: AvatarFrame): AvatarFrame {
  return { avatarFocusX: row.avatarFocusX, avatarFocusY: row.avatarFocusY, avatarZoom: row.avatarZoom };
}

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
    include: {
      games: { orderBy: { gameNumber: "asc" } },
      candidates: {
        include: {
          teammate: {
            select: { name: true, sessionsCount: true, avatarUrl: true, avatarFocusX: true, avatarFocusY: true, avatarZoom: true },
          },
        },
      },
      clientUser: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Unknown order." }, { status: 404 });

  const selected = order.candidates.find((candidate) => candidate.selected);

  return NextResponse.json(
    {
      id: order.id,
      // The number every screen shows and every support conversation quotes.
      // It was simply missing from this payload, so the teammate's order room
      // rendered "Order #" with nothing after it.
      orderNo: order.orderNo,
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
      teammateAvatarUrl: selected?.teammate.avatarUrl ?? null,
      // Only the three framing values — the rows behind these hold an email
      // and a password hash, and this response goes to the other party.
      teammateAvatarFrame: selected ? frameOf(selected.teammate) : null,
      customerAvatarUrl: order.clientUser?.avatarUrl ?? null,
      customerAvatarFrame: order.clientUser ? frameOf(order.clientUser) : null,
      // The in-game identity snapshotted at checkout (CheckoutIngameStep) —
      // who the teammate actually needs to add and what to expect from them.
      ign: order.ign,
      ignRegion: order.ignRegion,
      ignRank: order.ignRank,
      ignDivision: order.ignDivision,
      ignRoles: (order.ignRoles as string[] | null) ?? [],
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
