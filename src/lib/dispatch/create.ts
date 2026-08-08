import { after } from "next/server";
import { prisma } from "@/lib/db";
import { sendWave, SEARCH_HORIZON_MS } from "@/lib/dispatch/waves";
import { DISPATCH_EVENT, logDispatch } from "@/lib/dispatch/log";
import { teammateCut } from "@/lib/payoutSplit";
import { publish } from "@/lib/events/bus";
import { notifyOrderDispatched } from "@/lib/notify/orderNotifications";
import { Prisma } from "@/generated/prisma/client";

/**
 * A secret handle for one order.
 *
 * 32 hex characters from the platform's own CSPRNG. Kept well clear of the
 * order id, which is what every internal API route is keyed by: the point of
 * the token is that the link a customer keeps, forwards and pastes into a
 * support chat opens exactly one page and unlocks nothing else.
 */
function newAccessToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

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
      // The handle this order is reachable by from outside. Minted here so
      // every order has one — the column was added with a backfill for the
      // rows that already existed, and without this the next order written
      // would have been the first one without a token again.
      accessToken: newAccessToken(),
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
      dispatchDeadline: new Date(Date.now() + SEARCH_HORIZON_MS),
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

/** Opens the search and sends the first wave. */
async function dispatchOrder(orderId: string) {
  const now = new Date();

  const { dispatched, wave } = await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANDIDATES_READY",
        // The search has no cut-off — it runs until somebody accepts or the
        // customer cancels — but the column is non-null and several screens
        // still read it, so it is parked far enough ahead to never expire.
        dispatchDeadline: new Date(now.getTime() + SEARCH_HORIZON_MS),
        // The search clock starts here — at the payment, not at the top of
        // checkout where the order row was written.
        dispatchedAt: now,
      },
    });

    await logDispatch(
      tx,
      orderId,
      DISPATCH_EVENT.CREATED,
      `Order #${order.orderNo} released to dispatch — ${order.gameName} · ${order.option}` +
        `${order.ignRank ? `, ${order.ignRank}` : ""}${order.ignRegion ? ` · ${order.ignRegion.toUpperCase()}` : ""}.`,
      { detail: { teammatesRequested: order.teammatesRequested, replay: order.isReplay } },
    );

    const result = await sendWave(tx, orderId, now);
    if (result.exhausted) {
      // Not a failure — nobody is online for it *right now*. The wave clock
      // in reconcileOrder() starts over on its own once the cooldown passes.
      await tx.order.update({ where: { id: orderId }, data: { poolExhaustedAt: now } });
    }

    return {
      dispatched: await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { candidates: true } }),
      wave: result,
    };
  });

  // Wakes the invited teammates' panels straight away — this is the one event
  // where a poll interval is the difference between taking the order and
  // losing it to someone faster.
  const invited = wave.invited.map((teammate) => teammate.userId).filter((id): id is string => Boolean(id));
  await publish({ topic: "dispatch", key: dispatched.id, userIds: invited });
  await publish({
    topic: "orders",
    key: dispatched.id,
    userIds: dispatched.clientUserId ? [dispatched.clientUserId] : [],
  });

  // after(), not await and not a floating promise: the customer should not
  // wait on an SMTP handshake to see their search start, and a floating
  // promise would be dropped when the response ends the request.
  after(() => notifyOrderDispatched(dispatched.id));

  return dispatched;
}

