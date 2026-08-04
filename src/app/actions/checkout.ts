"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getGameBySlug } from "@/lib/games";
import { quoteBookingEUR } from "@/lib/bookingOptions";
import { calculateFee, type PaymentMethodKey } from "@/lib/payments";
import { createOrderWithDispatch, activateOrderAfterPayment } from "@/lib/dispatch/create";
import { findRedeemableCoupon, reserveCoupon, releaseCouponForOrder } from "@/lib/couponsServer";
import { startCheckout } from "@/lib/stripeCheckout";
import { spendCredits } from "@/app/actions/credits";

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
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const game = getGameBySlug(input.gameSlug);
  if (!game) return { ok: false, error: "Unknown game." };

  const subtotalEUR = quoteBookingEUR(input.option, input.teammates);
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
    teammates: input.teammates,
    requestedTeammateId: input.requestedTeammateId ?? null,
    customerLabel: (session?.user?.name || session?.user?.email || guestEmail || "Customer").slice(0, 120),
    clientUserId: userId,
    isReplay: !!input.isReplay,
    ign: input.ign?.slice(0, 60) ?? null,
    ignRegion: input.ignRegion?.slice(0, 20) ?? null,
    ignRoles: (input.ignRoles ?? []).slice(0, 6),
    ignRank: input.ignRank?.slice(0, 30) ?? null,
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
    return { ok: true, redirect: `/checkout/matching?order=${order.id}` };
  }

  try {
    const checkout = await startCheckout({
      amountEUR: totalEUR,
      description: `${game.name} · ${input.option}`,
      returnPath: `/checkout/matching?order=${order.id}`,
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
export async function rerollOrder(orderId: string): Promise<PlaceOrderResult> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const previous = await prisma.order.findFirst({
    where: {
      id: orderId,
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      ...(userId ? { clientUserId: userId } : {}),
    },
  });
  if (!previous) return { ok: false, error: "This session can't be rerolled." };
  if (!previous.rerollDeadline || previous.rerollDeadline.getTime() < Date.now()) {
    return { ok: false, error: "The reroll window for this session has closed." };
  }

  const replacement = await createOrderWithDispatch({
    gameSlug: previous.gameSlug,
    gameName: previous.gameName,
    option: previous.option,
    priceEUR: Number(previous.priceEUR),
    teammates: previous.teammatesRequested,
    requestedTeammateId: null,
    customerLabel: previous.customerLabel,
    clientUserId: previous.clientUserId,
    ign: previous.ign,
    ignRegion: previous.ignRegion,
    ignRoles: (previous.ignRoles as string[] | null) ?? [],
    ignRank: previous.ignRank,
    ignDivision: previous.ignDivision,
    awaitPayment: true,
  });

  await prisma.order.update({ where: { id: previous.id }, data: { status: "CANCELLED" } });
  await activateOrderAfterPayment(replacement.id);

  return { ok: true, redirect: `/checkout/matching?order=${replacement.id}` };
}

/**
 * "Play again with the same teammate" — the same money path as a first
 * booking, priced from the order being replayed rather than the catalogue,
 * since that price was already frozen when it was first placed.
 */
export async function placeReplayCheckout(
  orderId: string,
  method: PaymentMethodKey,
): Promise<PlaceOrderResult> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) return { ok: false, error: "Sign in to book another session." };

  const previous = await prisma.order.findFirst({
    where: { id: orderId, clientUserId: userId },
    include: { candidates: { where: { selected: true, isPrimary: true } } },
  });
  if (!previous) return { ok: false, error: "Unknown order." };

  const teammateId = previous.candidates[0]?.teammateId ?? null;
  if (!teammateId) return { ok: false, error: "That session has no teammate to play with again." };

  const priceEUR = Number(previous.priceEUR);
  const order = await createOrderWithDispatch({
    gameSlug: previous.gameSlug,
    gameName: previous.gameName,
    option: previous.option,
    priceEUR,
    teammates: previous.teammatesRequested,
    requestedTeammateId: teammateId,
    customerLabel: previous.customerLabel,
    clientUserId: userId,
    isReplay: true,
    ign: previous.ign,
    ignRegion: previous.ignRegion,
    ignRoles: (previous.ignRoles as string[] | null) ?? [],
    ignRank: previous.ignRank,
    ignDivision: previous.ignDivision,
    awaitPayment: true,
  });

  if (method === "credits") {
    const paid = await spendCredits(priceEUR, `Replay · ${previous.gameName}`);
    if (!paid.ok) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      return { ok: false, error: paid.error ?? "Couldn't pay with credits." };
    }
    await activateOrderAfterPayment(order.id);
    return { ok: true, redirect: `/checkout/matching?order=${order.id}` };
  }

  try {
    const checkout = await startCheckout({
      amountEUR: priceEUR,
      description: `Replay · ${previous.gameName} · ${previous.option}`,
      returnPath: `/checkout/matching?order=${order.id}`,
      kind: "ORDER",
      orderId: order.id,
      methods: method === "paypal" ? ["paypal"] : ["card"],
      saveCard: true,
    });
    return { ok: true, redirect: checkout.url };
  } catch (err) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
  }
}
