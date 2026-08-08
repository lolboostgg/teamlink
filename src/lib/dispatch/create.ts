import { prisma } from "@/lib/db";
import { MAX_CANDIDATES, DISPATCH_WINDOW_MS } from "@/lib/dispatch/service";
import { teammateCut } from "@/lib/payoutSplit";
import { publish } from "@/lib/events/bus";
import { notifyOrderDispatched } from "@/lib/notify/orderNotifications";
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
  /** Where to mail a guest order. Null for an account order, which mails the
   * address on the account instead. */
  guestEmail?: string | null;
  isReplay?: boolean;
  /** In-game identity, snapshotted onto the order. */
  ign?: string | null;
  ignRegion?: string | null;
  ignRoles?: string[];
  ignRank?: string | null;
  ignDivision?: string | null;
  /**
   * Hold the order at AWAITING_PAYMENT instead of inviting anyone.
   *
   * Nobody should be pulled out of a queue for an order that hasn't been
   * paid for, so a card checkout parks the order here and Stripe's webhook
   * releases it (see activateOrderAfterPayment). Credit payments are settled
   * before the order is written at all and skip this.
   */
  awaitPayment?: boolean;
}

/**
 * Places an order.
 *
 * Unless it is waiting for a payment, it is fanned out to at most five
 * eligible teammates right away. Eligibility is decided here, server-side:
 * listed for the game, marked available, and not already tied up in another
 * order.
 */
export async function createOrderWithDispatch(input: CreateOrderInput) {
  const order = await prisma.order.create({
    data: {
      clientUserId: input.clientUserId,
      customerLabel: input.customerLabel,
      guestEmail: input.guestEmail ?? null,
      gameSlug: input.gameSlug,
      gameName: input.gameName,
      option: input.option,
      priceEUR: input.priceEUR,
      // Frozen at creation, so a later price change to the roster or the
      // options table can't retroactively move what this order pays out.
      teammatePayoutEUR: teammateCut(input.priceEUR),
      teammatesRequested: Math.max(1, input.teammates),
      requestedTeammateId: input.requestedTeammateId,
      status: "AWAITING_PAYMENT",
      // Replaced by the real window the moment the order is dispatched; a
      // non-null column needs *something* until then.
      dispatchDeadline: new Date(Date.now() + DISPATCH_WINDOW_MS),
      isReplay: !!input.isReplay,
      ign: input.ign ?? null,
      ignRegion: input.ignRegion ?? null,
      ignRoles: (input.ignRoles ?? []) as Prisma.InputJsonValue,
      ignRank: input.ignRank ?? null,
      ignDivision: input.ignDivision ?? null,
    },
    include: { candidates: true },
  });

  if (input.awaitPayment) return order;
  return dispatchOrder(order.id);
}

/**
 * Releases a paid order into the dispatcher.
 *
 * Called from the Stripe webhook, so it has to survive a redelivery: an
 * order that already left AWAITING_PAYMENT is returned untouched rather
 * than invited a second time.
 */
export async function activateOrderAfterPayment(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
  if (!order) return null;
  if (order.status !== "AWAITING_PAYMENT") return order;
  return dispatchOrder(orderId);
}

/** Picks the invite wave and opens the dispatch window. */
async function dispatchOrder(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const now = new Date();
  // Give the customer a short setup window for preferences before any
  // teammate sees an alert. A little variation keeps it feeling natural.
  const alertDelayMs = order.isReplay ? 0 : 10_000 + Math.floor(Math.random() * 5_001);
  const inviteAt = new Date(now.getTime() + alertDelayMs);
  const deadline = new Date(now.getTime() + DISPATCH_WINDOW_MS);

  const pool = order.requestedTeammateId
    ? await prisma.teammate.findMany({ where: { id: order.requestedTeammateId } })
    : await eligibleTeammates(order.gameSlug, order.clientUserId);
  const invitees = pool.slice(0, MAX_CANDIDATES);

  const dispatched = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: invitees.length > 0 ? "CANDIDATES_READY" : "NO_MATCH",
        dispatchDeadline: deadline,
        // The search clock starts here — at the payment, not at the top of
        // checkout where the order row was written.
        dispatchedAt: now,
        candidates: {
          create: invitees.map((teammate) => ({
            teammateId: teammate.id,
            invitedAt: inviteAt,
            expiresAt: deadline,
          })),
        },
      },
      include: { candidates: true },
    });
    if (invitees.length > 0) {
      await tx.teammate.updateMany({
        where: { id: { in: invitees.map((teammate) => teammate.id) } },
        data: { lastDispatchAt: inviteAt },
      });
    }
    return updated;
  });

  // Wakes the invited teammates' panels straight away — this is the one event
  // where a poll interval is the difference between taking the order and
  // losing it to someone faster.
  const invited = invitees.map((teammate) => teammate.userId).filter((id): id is string => Boolean(id));
  await publish({ topic: "dispatch", key: dispatched.id, userIds: invited });
  await publish({ topic: "orders", key: dispatched.id, userIds: order.clientUserId ? [order.clientUserId] : [] });

  // Mail and Discord go out after the live push, and are not awaited: SMTP and
  // the Discord API are both third parties on the far side of a network, and
  // the customer is already staring at the search screen by now. Failures are
  // logged inside notifyOrderDispatched and go no further.
  void notifyOrderDispatched(dispatched.id);

  return dispatched;
}

/**
 * How stale a teammate's last panel read may be and still count as online.
 *
 * The panel beats every 20s (lib/dispatch/useDispatchState.ts); this allows
 * several missed beats, because a browser throttles timers in a background
 * tab and a teammate waiting for work usually has the dashboard behind
 * whatever they're doing meanwhile. Anyone who actually closed it drops out
 * of the pool two minutes later.
 */
const HEARTBEAT_MAX_AGE_MS = 120_000;

async function eligibleTeammates(gameSlug: string, clientUserId: string | null) {
  const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_MAX_AGE_MS);
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
