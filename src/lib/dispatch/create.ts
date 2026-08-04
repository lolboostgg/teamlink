import { prisma } from "@/lib/db";
import { MAX_CANDIDATES, DISPATCH_WINDOW_MS } from "@/lib/dispatch/service";
import { teammateCut } from "@/lib/payoutSplit";
import { publish } from "@/lib/events/bus";
import { Prisma } from "@/generated/prisma/client";

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
  /** In-game identity, snapshotted onto the order. */
  ign?: string | null;
  ignRegion?: string | null;
  ignRoles?: string[];
  ignRank?: string | null;
  ignDivision?: string | null;
}

/**
 * Places an order and fans it out to at most five eligible teammates.
 * Eligibility is decided here, server-side: listed for the game, marked
 * available, and not already tied up in another order.
 */
export async function createOrderWithDispatch(input: CreateOrderInput) {
  const now = new Date();
  // Give the customer a short setup window for preferences before any
  // teammate sees an alert. A little variation keeps it feeling natural.
  const alertDelayMs = input.isReplay ? 0 : 10_000 + Math.floor(Math.random() * 5_001);
  const inviteAt = new Date(now.getTime() + alertDelayMs);
  const deadline = new Date(now.getTime() + DISPATCH_WINDOW_MS);

  const pool = input.requestedTeammateId
    ? await prisma.teammate.findMany({ where: { id: input.requestedTeammateId } })
    : await eligibleTeammates(input.gameSlug, input.clientUserId);

  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: {
      clientUserId: input.clientUserId,
      customerLabel: input.customerLabel,
      gameSlug: input.gameSlug,
      gameName: input.gameName,
      option: input.option,
      priceEUR: input.priceEUR,
      // Frozen at creation, so a later price change to the roster or the
      // options table can't retroactively move what this order pays out.
      teammatePayoutEUR: teammateCut(input.priceEUR),
      teammatesRequested: Math.max(1, input.teammates),
      requestedTeammateId: input.requestedTeammateId,
      status: pool.length > 0 ? "CANDIDATES_READY" : "NO_MATCH",
      dispatchDeadline: deadline,
      isReplay: !!input.isReplay,
      ign: input.ign ?? null,
      ignRegion: input.ignRegion ?? null,
      ignRoles: (input.ignRoles ?? []) as Prisma.InputJsonValue,
      ignRank: input.ignRank ?? null,
      ignDivision: input.ignDivision ?? null,
      candidates: {
        create: pool.slice(0, MAX_CANDIDATES).map((t) => ({
          teammateId: t.id,
          invitedAt: inviteAt,
          expiresAt: deadline,
        })),
      },
    },
    include: { candidates: true },
    });
    if (pool.length > 0) {
      await tx.teammate.updateMany({
        where: { id: { in: pool.slice(0, MAX_CANDIDATES).map((teammate) => teammate.id) } },
        data: { lastDispatchAt: inviteAt },
      });
    }
    return order;
  });

  // Wakes the invited teammates' panels straight away — this is the one event
  // where a poll interval is the difference between taking the order and
  // losing it to someone faster.
  const invited = pool.slice(0, MAX_CANDIDATES).map((teammate) => teammate.userId).filter((id): id is string => Boolean(id));
  await publish({ topic: "dispatch", key: created.id, userIds: invited });

  return created;
}

async function eligibleTeammates(gameSlug: string, clientUserId: string | null) {
  const heartbeatCutoff = new Date(Date.now() - 45_000);
  const available = await prisma.teammate.findMany({
    where: { available: true, lastSeenAt: { gte: heartbeatCutoff } },
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
            { status: "PENDING", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
          ],
        },
        select: { teammateId: true },
      })
    ).map((c) => c.teammateId),
  );

  const eligible = listed.filter((t) => !busyIds.has(t.id));
  const favoriteIds = clientUserId
    ? new Set((await prisma.favoriteTeammate.findMany({
        where: { clientUserId, teammateId: { in: eligible.map((teammate) => teammate.id) } },
        select: { teammateId: true },
      })).map((favorite) => favorite.teammateId))
    : new Set<string>();
  const now = Date.now();

  // Fairness is based on server timestamps, never on a browser timer. A
  // favorite is guaranteed into the invite wave; otherwise teammates who
  // have kept the live panel open longest without a dispatch rise first.
  return eligible.sort((a, b) => {
    const score = (teammate: typeof a) => {
      const waitSince = teammate.lastDispatchAt ?? teammate.availableSince ?? teammate.lastSeenAt ?? teammate.createdAt;
      const waitingMinutes = Math.max(0, (now - waitSince.getTime()) / 60_000);
      const onlineMinutes = teammate.availableSince ? Math.max(0, (now - teammate.availableSince.getTime()) / 60_000) : 0;
      return (favoriteIds.has(teammate.id) ? 1_000_000 : 0) + waitingMinutes * 100 + onlineMinutes + teammate.rating * 10;
    };
    return score(b) - score(a) || a.createdAt.getTime() - b.createdAt.getTime();
  });
}
