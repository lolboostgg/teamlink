"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { chargeDefaultCard, startCheckout } from "@/lib/stripeCheckout";
import { applyExtraGames } from "@/lib/dispatch/extraGames";
import { recordTip, getTipForOrder } from "@/lib/tipsServer";
import { claimFulfilment } from "@/lib/chargeFulfilment";
import { spendCredits } from "@/app/actions/credits";
import type { PaymentMethodKey } from "@/lib/payments";

export type ExtraPaymentResult =
  | { ok: true }
  /** The customer has to finish paying on Stripe's hosted page. */
  | { ok: true; redirect: string }
  | { ok: false; error: string };

const MAX_TIP_EUR = 200;

/**
 * "Add games" during a live session.
 *
 * The amount is derived from the order's own unit price here, never sent by
 * the client — the button only says how many.
 */
export async function addGames(orderId: string, quantity: number, method: PaymentMethodKey): Promise<ExtraPaymentResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Sign in to extend this session." };

  const qty = Math.max(1, Math.min(9, Math.round(quantity)));
  const order = await prisma.order.findFirst({
    where: { id: orderId, clientUserId: userId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
  });
  if (!order) return { ok: false, error: "This session cannot be extended." };

  const unitPrice = Number(order.priceEUR) / Math.max(1, order.gamesBooked);
  const amountEUR = Math.round(unitPrice * qty * 100) / 100;

  if (method === "credits") {
    const paid = await spendCredits(amountEUR, `${qty}x extra game · ${order.gameName}`);
    if (!paid.ok) return { ok: false, error: paid.error ?? "Couldn't pay with credits." };
    await applyExtraGames(orderId, qty);
    return { ok: true };
  }

  const charged = await chargeDefaultCard({
    amountEUR,
    description: `${qty} more game${qty > 1 ? "s" : ""} · ${order.gameName}`,
    kind: "EXTRA_GAMES",
    orderId,
  });

  if (charged.ok) {
    // The webhook will hear about this payment too; whoever claims it first
    // is the one that adds the games.
    if (await claimFulfilment(charged.chargeId)) await applyExtraGames(orderId, qty);
    revalidatePath("/dashboard/client/wallet");
    return { ok: true };
  }

  // No saved card, or the bank wants the customer present: hosted checkout
  // takes over and the webhook adds the games once it is paid.
  if (charged.requiresAction) {
    try {
      const checkout = await startCheckout({
        amountEUR,
        description: `${qty} more game${qty > 1 ? "s" : ""} · ${order.gameName}`,
        returnPath: `/checkout/matching?order=${orderId}`,
        kind: "EXTRA_GAMES",
        orderId,
        methods: method === "paypal" ? ["paypal"] : ["card"],
        extraMetadata: { quantity: String(qty) },
      });
      return { ok: true, redirect: checkout.url };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
    }
  }

  return { ok: false, error: charged.error };
}

/**
 * Tipping the teammate after a session.
 *
 * One tip per order, and it only exists once the money did — the teammate's
 * balance is credited from the same transaction that writes the tip.
 */
export async function sendTip(orderId: string, amountEUR: number, method: PaymentMethodKey): Promise<ExtraPaymentResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Sign in to send a tip." };

  const amount = Math.round(Number(amountEUR) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a tip amount." };
  if (amount > MAX_TIP_EUR) return { ok: false, error: `Tips are capped at €${MAX_TIP_EUR}.` };

  const order = await prisma.order.findFirst({
    where: { id: orderId, clientUserId: userId, status: "COMPLETED" },
  });
  if (!order) return { ok: false, error: "You can only tip a session you completed." };
  if (await getTipForOrder(orderId)) return { ok: false, error: "You already tipped this session." };

  if (method === "credits") {
    const paid = await spendCredits(amount, `Tip · ${order.gameName}`);
    if (!paid.ok) return { ok: false, error: paid.error ?? "Couldn't pay with credits." };
    await recordTip({ orderId, amountEUR: amount, fromUserId: userId });
    return { ok: true };
  }

  const charged = await chargeDefaultCard({
    amountEUR: amount,
    description: `Tip · ${order.gameName}`,
    kind: "TIP",
    orderId,
  });

  if (charged.ok) {
    if (await claimFulfilment(charged.chargeId)) {
      await recordTip({ orderId, amountEUR: amount, fromUserId: userId, chargeId: charged.chargeId });
    }
    revalidatePath("/dashboard/client/wallet");
    return { ok: true };
  }

  if (charged.requiresAction) {
    try {
      const checkout = await startCheckout({
        amountEUR: amount,
        description: `Tip · ${order.gameName}`,
        returnPath: `/checkout/matching?order=${orderId}`,
        kind: "TIP",
        orderId,
        methods: method === "paypal" ? ["paypal"] : ["card"],
        saveCard: false,
      });
      return { ok: true, redirect: checkout.url };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
    }
  }

  return { ok: false, error: charged.error };
}

/** What the session-complete screen shows instead of the tip buttons. */
export async function loadTip(orderId: string): Promise<{ amountEUR: number } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const order = await prisma.order.findFirst({
    where: { id: orderId, clientUserId: session.user.id },
    select: { id: true },
  });
  if (!order) return null;
  const tip = await getTipForOrder(orderId);
  return tip ? { amountEUR: Number(tip.amountEUR) } : null;
}
