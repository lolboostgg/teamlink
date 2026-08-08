import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { reconcileOrder } from "@/lib/dispatch/service";
import { candidateTarget } from "@/lib/dispatch/waves";

export const dynamic = "force-dynamic";

/**
 * Every order currently in the dispatcher, with the wave behind it.
 *
 * The orders list shows what an order became. This shows what is happening to
 * it right now — which is the only view in which "why has #1234 been queued
 * for two minutes" has an answer, because the answer is always in the
 * candidate rows and the log rather than on the order itself.
 *
 * Reading also ticks the wave clock, so an admin watching this page keeps the
 * dispatcher moving even when nobody else is looking.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const focus = url.searchParams.get("order");

  const live = await prisma.order.findMany({
    where: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } },
    select: { id: true },
  });
  for (const order of live) await reconcileOrder(order.id);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } },
        // Just-assigned orders stay on the board for a moment so the admin
        // sees how the one they were watching resolved instead of it simply
        // vanishing from the list.
        { status: { in: ["ASSIGNED"] }, assignedAt: { gte: new Date(Date.now() - 120_000) } },
      ],
    },
    include: {
      candidates: {
        include: { teammate: { select: { id: true, name: true, rating: true, avatarUrl: true } } },
        orderBy: [{ wave: "asc" }, { invitedAt: "asc" }],
      },
    },
    orderBy: { dispatchedAt: "asc" },
    take: 50,
  });

  const log = focus
    ? await prisma.dispatchEvent.findMany({
        where: { orderId: focus },
        orderBy: { createdAt: "asc" },
        take: 300,
      })
    : [];

  const now = Date.now();

  return NextResponse.json(
    {
      serverNow: now,
      orders: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        gameSlug: order.gameSlug,
        gameName: order.gameName,
        option: order.option,
        priceEUR: Number(order.priceEUR),
        teammatesRequested: order.teammatesRequested,
        target: candidateTarget(order.teammatesRequested),
        rank: order.ignRank,
        division: order.ignDivision,
        region: order.ignRegion,
        ign: order.ign,
        wave: order.dispatchWave,
        waveDeadline: order.waveDeadline?.getTime() ?? null,
        poolExhaustedAt: order.poolExhaustedAt?.getTime() ?? null,
        matchingPaused: order.matchingPaused,
        queuedSince: (order.dispatchedAt ?? order.createdAt).getTime(),
        selectionDeadline: order.selectionDeadline?.getTime() ?? null,
        candidates: order.candidates.map((candidate) => ({
          id: candidate.id,
          teammateId: candidate.teammateId,
          name: candidate.teammate.name,
          rating: candidate.teammate.rating,
          avatarUrl: candidate.teammate.avatarUrl,
          status: candidate.status,
          wave: candidate.wave,
          delivered: Boolean(candidate.deliveredAt),
          selected: candidate.selected,
          respondedMs:
            candidate.respondedAt ? candidate.respondedAt.getTime() - candidate.invitedAt.getTime() : null,
        })),
      })),
      log: log.map((entry) => ({
        id: entry.id,
        type: entry.type,
        message: entry.message,
        at: entry.createdAt.getTime(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
