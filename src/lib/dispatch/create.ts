import { prisma } from "@/lib/db";
import { MAX_CANDIDATES, DISPATCH_WINDOW_MS } from "@/lib/dispatch/service";

export interface CreateOrderInput {
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  teammates: number;
  requestedTeammateId: string | null;
  customerLabel: string;
  clientUserId: string | null;
  isReplay?: boolean;
}

/**
 * Places an order and fans it out to at most five eligible teammates.
 * Eligibility is decided here, server-side: listed for the game, marked
 * available, and not already tied up in another order.
 */
export async function createOrderWithDispatch(input: CreateOrderInput) {
  const now = new Date();
  const deadline = new Date(now.getTime() + DISPATCH_WINDOW_MS);

  const pool = input.requestedTeammateId
    ? await prisma.teammate.findMany({ where: { id: input.requestedTeammateId } })
    : await eligibleTeammates(input.gameSlug);

  return prisma.order.create({
    data: {
      clientUserId: input.clientUserId,
      customerLabel: input.customerLabel,
      gameSlug: input.gameSlug,
      gameName: input.gameName,
      option: input.option,
      priceEUR: input.priceEUR,
      teammatesRequested: Math.max(1, input.teammates),
      requestedTeammateId: input.requestedTeammateId,
      status: pool.length > 0 ? "CANDIDATES_READY" : "NO_MATCH",
      dispatchDeadline: deadline,
      isReplay: !!input.isReplay,
      candidates: {
        create: pool.slice(0, MAX_CANDIDATES).map((t) => ({
          teammateId: t.id,
          invitedAt: now,
          expiresAt: deadline,
        })),
      },
    },
    include: { candidates: true },
  });
}

async function eligibleTeammates(gameSlug: string) {
  const available = await prisma.teammate.findMany({
    where: { available: true },
    orderBy: { rating: "desc" },
  });

  // gameSlugs is a Json array, so the "listed for this game" filter can't be
  // pushed into the query — the roster is small enough to filter in memory.
  const listed = available.filter((t) => ((t.gameSlugs as string[] | null) ?? []).includes(gameSlug));

  const busyIds = new Set(
    (
      await prisma.dispatchCandidate.findMany({
        where: {
          teammateId: { in: listed.map((t) => t.id) },
          OR: [
            { selected: true, order: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } },
            { status: "ACCEPTED", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
            { status: "PENDING", order: { status: { in: ["SEARCHING", "CANDIDATES_READY"] } } },
          ],
        },
        select: { teammateId: true },
      })
    ).map((c) => c.teammateId),
  );

  return listed.filter((t) => !busyIds.has(t.id));
}
