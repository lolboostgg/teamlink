"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getGameBySlug } from "@/lib/games";
import { quoteBookingEUR } from "@/lib/bookingOptions";
import { calculateFee, type PaymentMethodKey } from "@/lib/payments";
import { createOrderWithDispatch, activateOrderAfterPayment } from "@/lib/dispatch/create";
import { findRedeemableCoupon, reserveCoupon, releaseCouponForOrder } from "@/lib/couponsServer";
import { startCheckout } from "@/lib/stripeCheckout";
import { settleCheckoutSession } from "@/lib/fulfilment";
import { spendCredits } from "@/app/actions/credits";
import { refundCreditsToUser } from "@/lib/creditsServer";
import { ranksForGame } from "@/lib/gameRanks";
import { authorizeCustomerOrder } from "@/lib/orderAccess";

export interface PlaceOrderInput {
  gameSlug: string;
  option: string;
  teammates: number;
  method: PaymentMethodKey;
  couponCode?: string | null;
  guestEmail?: string | null;
  requestedTeammateId?: string | null;
  isReplay?: boolean;
  ign?: string | null;
  ignRegion?: string | null;
  ignRoles?: string[];
  ignRank?: string | null;
  ignDivision?: string | null;
}

export type PlaceOrderResult = { ok: true; redirect: string } | { ok: false; error: string };

/**
 * Settles the checkout the customer just came back from.
 *
 * Without this the screen sits on "confirming your payment" until Stripe's
 * webhook happens to arrive — which is fine when it's seconds away and
 * dreadful when the endpoint is slow or misconfigured. The session id in the
 * return URL is only a pointer: the payment status is read back from Stripe
 * itself, so a hand-typed URL settles nothing. The webhook stays the
 * guarantee for customers who close the tab.
 */
/**
 * Where to send the customer for one order.
 *
 * The token URL, when the order has one. It is the address they keep — it
 * survives in their history, gets forwarded and pasted into support threads —
 * and it must not be the order's real id, which every internal API route is
 * keyed by. Orders written before the column existed still resolve by id.
 */
function orderPath(order: { id: string; accessToken?: string | null }): string {
  return order.accessToken
    ? `/order/${encodeURIComponent(order.accessToken)}`
    : `/checkout/matching?order=${order.id}`;
}

export async function confirmCheckoutReturn(sessionId: string): Promise<{ settled: boolean }> {
  return { settled: await settleCheckoutSession(sessionId) };
}

/**
 * Checkout, end to end.
 *
 * The price is recomputed here from the booking catalogue — the total in the
 * checkout URL is a display value the customer can edit, and it must never be
 * what gets charged. Same for the discount: the coupon is looked up and burned
 * server-side, not taken on the client's word.
 *
 * A card or PayPal order is parked at AWAITING_PAYMENT and only fanned out to
 * teammates once Stripe's webhook confirms the money (see
 * activateOrderAfterPayment). Nobody gets pulled out of a queue for an order
 * that hasn't been paid for.
 */
export async function placeCheckoutOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    return await placeCheckoutOrderInner(input);
  } catch (err) {
    console.error("[checkout] order placement failed:", err);
    if (
      err instanceof Error &&
      (/unitPriceEUR|idempotencyKey/i.test(err.message) || "code" in err && err.code === "P2022")
    ) {
      return { ok: false, error: "Checkout is being updated. Please try again in a moment." };
    }
    return { ok: false, error: "Checkout could not be completed. Your credits were not charged. Please try again." };
  }
}

async function placeCheckoutOrderInner(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const game = getGameBySlug(input.gameSlug);
  if (!game) return { ok: false, error: "Unknown game." };

  const validRank = ranksForGame(input.gameSlug).some((rank) => rank.value === input.ignRank) ? input.ignRank : null;
  const subtotalEUR = quoteBookingEUR(input.gameSlug, input.option, input.teammates, validRank);
  if (subtotalEUR === null) return { ok: false, error: "Unknown booking option." };

  const guestEmail = input.guestEmail?.trim().toLowerCase() || null;
  if (!userId && !guestEmail) return { ok: false, error: "An email address is required to check out." };
  if (input.method === "credits" && !userId) return { ok: false, error: "Sign in to pay with credits." };
  if (input.method === "crypto") return { ok: false, error: "Crypto payments aren't available yet." };

  const coupon = input.couponCode ? await findRedeemableCoupon(input.couponCode, userId) : null;
  if (input.couponCode && !coupon) return { ok: false, error: "That coupon isn't valid any more." };

  const feeEUR = calculateFee(subtotalEUR, input.method);
  const discountEUR = coupon ? (subtotalEUR * coupon.discountPercent) / 100 : 0;
  const totalEUR = Math.max(0, Math.round((subtotalEUR + feeEUR - discountEUR) * 100) / 100);
  if (totalEUR <= 0) return { ok: false, error: "That order comes to nothing payable." };

  const order = await createOrderWithDispatch({
    gameSlug: game.slug,
    gameName: game.name,
    option: input.option.slice(0, 120),
    priceEUR: totalEUR,
    unitPriceEUR: subtotalEUR,
    teammates: input.teammates,
    requestedTeammateId: input.requestedTeammateId ?? null,
    customerLabel: (session?.user?.name || session?.user?.email || guestEmail || "Customer").slice(0, 120),
    clientUserId: userId,
    // Only for a guest: an account order is mailed at the address on the
    // account, which stays right when the account's email later changes.
    guestEmail: userId ? null : guestEmail,
    isReplay: !!input.isReplay,
    ign: input.ign?.slice(0, 60) ?? null,
    ignRegion: input.ignRegion?.slice(0, 20) ?? null,
    ignRoles: (input.ignRoles ?? []).slice(0, 6),
    ignRank: validRank,
    ignDivision: input.ignDivision?.slice(0, 5) ?? null,
    // Everything waits for its payment; credits are settled a few lines down
    // and release the order themselves.
    awaitPayment: true,
  });

  if (coupon) {
    const reserved = await prisma.$transaction((tx) => reserveCoupon(tx, coupon.id, order.id));
    if (!reserved) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      return { ok: false, error: "That coupon was already used." };
    }
  }

  if (input.method === "credits") {
    const paid = await spendCredits(totalEUR, `${game.name} · ${input.option}`);
    if (!paid.ok) {
      await releaseCouponForOrder(order.id);
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      return { ok: false, error: paid.error ?? "Couldn't pay with credits." };
    }
    await activateOrderAfterPayment(order.id);
    return { ok: true, redirect: orderPath(order) };
  }

  try {
    const checkout = await startCheckout({
      amountEUR: totalEUR,
      description: `${game.name} · ${input.option}`,
      returnPath: orderPath(order),
      kind: "ORDER",
      orderId: order.id,
      guestEmail: guestEmail ?? undefined,
      methods: input.method === "paypal" ? ["paypal"] : ["card"],
      saveCard: true,
    });
    return { ok: true, redirect: checkout.url };
  } catch (err) {
    await releaseCouponForOrder(order.id);
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
  }
}

/**
 * "Reroll for a new teammate" during the window right after a pick.
 *
 * The customer already paid for this booking, so no money moves: the old
 * order is cancelled and its price carried onto a fresh one, which is
 * dispatched immediately. Doing it this way — rather than letting the
 * browser place a new order — is what keeps "create an order" from being a
 * way to get one for free.
 */
export async function rerollOrder(orderId: string, accessToken?: string | null): Promise<PlaceOrderResult> {
  const previous = await authorizeCustomerOrder(orderId, accessToken);
  if (!previous || !["ASSIGNED", "IN_PROGRESS"].includes(previous.status)) {
    return { ok: false, error: "This session can't be rerolled." };
  }
  if (!previous.rerollDeadline || previous.rerollDeadline.getTime() < Date.now()) {
    return { ok: false, error: "The reroll window for this session has closed." };
  }

  // Whoever the customer is rerolling away from, plus everyone they rerolled
  // away from on the orders before this one. Cancelling the old order frees
  // its teammate from the `busy` check, so without carrying this forward the
  // dispatcher would rank the person just rejected right back at the top —
  // and a second reroll would hand back the first one.
  const rejected = await prisma.dispatchCandidate.findMany({
    where: { orderId: previous.id, selected: true },
    select: { teammateId: true },
  });
  const excludedTeammateIds = [
    ...new Set([
      ...(Array.isArray(previous.excludedTeammateIds)
        ? previous.excludedTeammateIds.filter((id): id is string => typeof id === "string")
        : []),
      ...rejected.map((candidate) => candidate.teammateId),
    ]),
  ];

  const replacement = await createOrderWithDispatch({
    gameSlug: previous.gameSlug,
    gameName: previous.gameName,
    option: previous.option,
    priceEUR: Number(previous.priceEUR),
    unitPriceEUR: Number(previous.unitPriceEUR),
    teammates: previous.teammatesRequested,
    requestedTeammateId: null,
    customerLabel: previous.customerLabel,
    clientUserId: previous.clientUserId,
    ign: previous.ign,
    ignRegion: previous.ignRegion,
    ignRoles: (previous.ignRoles as string[] | null) ?? [],
    ignRank: previous.ignRank,
    ignDivision: previous.ignDivision,
    excludedTeammateIds,
    awaitPayment: true,
  });

  await prisma.order.update({ where: { id: previous.id }, data: { status: "CANCELLED" } });
  await activateOrderAfterPayment(replacement.id);

  return { ok: true, redirect: orderPath(replacement) };
}

/**
 * "Play again with the same teammate" — the same money path as a first
 * booking, priced from the order being replayed rather than the catalogue,
 * since that price was already frozen when it was first placed.
 */
export async function placeReplayCheckout(
  orderId: string,
  method: PaymentMethodKey,
  accessToken?: string | null,
): Promise<PlaceOrderResult> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Playing again is the single best moment this product has, and it used to
  // be reserved for people with an account — a guest who just had a good
  // session was told to sign up first. Knowing the order id is the
  // capability, as everywhere else in the guest flow; an account-bound order
  // still requires its owner.
  const authorized = await authorizeCustomerOrder(orderId, accessToken);
  if (!authorized) return { ok: false, error: "Unknown order." };
  const previous = await prisma.order.findUnique({
    where: { id: authorized.id },
    include: { candidates: { where: { selected: true, isPrimary: true } } },
  });
  if (!previous) return { ok: false, error: "Unknown order." };

  // Credits are an account balance, so a guest has none to spend.
  if (method === "credits" && !userId) {
    return { ok: false, error: "Sign in to pay from your balance, or pay by card or PayPal." };
  }
  if (method === "crypto") return { ok: false, error: "Crypto payments aren't available yet." };

  const teammateId = previous.candidates[0]?.teammateId ?? null;
  if (!teammateId) return { ok: false, error: "That session has no teammate to play with again." };

  // A replay is always one game. Extra games raise both priceEUR and
  // gamesBooked on the old order, so carrying the whole running total would
  // charge for every game from the previous session again.
  const priceEUR = Number(previous.unitPriceEUR);
  const replayTotalEUR = Math.round((priceEUR + calculateFee(priceEUR, method)) * 100) / 100;
  const order = await createOrderWithDispatch({
    gameSlug: previous.gameSlug,
    gameName: previous.gameName,
    option: previous.option,
    priceEUR: replayTotalEUR,
    unitPriceEUR: priceEUR,
    teammates: previous.teammatesRequested,
    requestedTeammateId: teammateId,
    customerLabel: previous.customerLabel,
    clientUserId: userId,
    // Carried over so a guest's replay is mailed to the same address the
    // first booking was — there is no account to read one off.
    guestEmail: userId ? null : previous.guestEmail,
    isReplay: true,
    ign: previous.ign,
    ignRegion: previous.ignRegion,
    ignRoles: (previous.ignRoles as string[] | null) ?? [],
    ignRank: previous.ignRank,
    ignDivision: previous.ignDivision,
    awaitPayment: true,
  });

  if (method === "credits") {
    const paid = await spendCredits(replayTotalEUR, `Replay · ${previous.gameName}`);
    if (!paid.ok) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      return { ok: false, error: paid.error ?? "Couldn't pay with credits." };
    }

    // The balance is already gone by this point. If releasing the order into
    // dispatch then fails, the customer has paid for a session that does not
    // exist and the only thing they were told was "try again" — so the money
    // goes back before anything is said, and the failure is logged with the
    // order id rather than disappearing into a server-action digest.
    try {
      await activateOrderAfterPayment(order.id);
    } catch (err) {
      console.error(`[replay] dispatch failed for order ${order.id}, refunding credits:`, err);
      await refundCreditsToUser(userId!, replayTotalEUR, `Refund · replay could not start`, order.id);
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      return {
        ok: false,
        error: "We couldn't start that session, so nothing was charged — your balance is untouched.",
      };
    }

    return { ok: true, redirect: orderPath(order) };
  }

  try {
    const checkout = await startCheckout({
      amountEUR: replayTotalEUR,
      description: `Replay · ${previous.gameName} · ${previous.option}`,
      returnPath: orderPath(order),
      kind: "ORDER",
      orderId: order.id,
      methods: method === "paypal" ? ["paypal"] : ["card"],
      saveCard: true,
      // Already given at the first checkout and stored on the order — asking
      // a guest for it again, on a booking they are repeating, is asking a
      // question we know the answer to.
      guestEmail: previous.guestEmail ?? undefined,
    });
    return { ok: true, redirect: checkout.url };
  } catch (err) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
  }
}
