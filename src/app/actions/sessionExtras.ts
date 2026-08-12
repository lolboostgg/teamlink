"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { chargeDefaultCard, startCheckout } from "@/lib/stripeCheckout";
import { applyExtraGames } from "@/lib/dispatch/extraGames";
import { recordTip, getTipForOrder } from "@/lib/tipsServer";
import { claimFulfilment } from "@/lib/chargeFulfilment";
import { spendCredits } from "@/app/actions/credits";
import { calculateFee, type PaymentMethodKey } from "@/lib/payments";
import { authorizeCustomerOrder } from "@/lib/orderAccess";
import { spendCreditsOnce } from "@/lib/creditsServer";
import { publish } from "@/lib/events/bus";

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
export async function addGames(
  orderId: string,
  quantity: number,
  method: PaymentMethodKey,
  accessToken?: string | null,
  idempotencyKey?: string,
): Promise<ExtraPaymentResult> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const qty = Math.max(1, Math.min(9, Math.round(quantity)));
  // Same rule as tipping and playing again: the order id is the capability
  // for a guest, and an account-bound order still requires its owner.
  const order = await authorizeCustomerOrder(orderId, accessToken);
  if (!order || !["ASSIGNED", "IN_PROGRESS"].includes(order.status)) {
    return { ok: false, error: "This session cannot be extended." };
  }
  if (method === "credits" && !userId) {
    return { ok: false, error: "Sign in to pay from your balance, or pay by card or PayPal." };
  }
  if (method === "crypto") return { ok: false, error: "Crypto payments aren't available yet." };

  const subtotalEUR = Math.round(Number(order.unitPriceEUR) * qty * 100) / 100;
  const amountEUR = Math.round((subtotalEUR + calculateFee(subtotalEUR, method)) * 100) / 100;
  const returnPath = order.accessToken
    ? `/order/${encodeURIComponent(order.accessToken)}`
    : `/checkout/matching?order=${orderId}`;

  if (method === "credits") {
    const paid = await spendCreditsOnce({
      userId: userId!, orderId, amountEUR,
      note: `${qty}x extra game · ${order.gameName}`,
      idempotencyKey: idempotencyKey ?? "",
    });
    if (!paid.ok) return { ok: false, error: paid.error ?? "Couldn't pay with credits." };
    if (await claimFulfilment(paid.chargeId)) await applyExtraGames(orderId, qty);
    await publish({ topic: "orders", key: "credits", userIds: [userId!] });
    return { ok: true };
  }

  // No account means no saved card to try first — straight to the hosted
  // page, where the webhook adds the games once it is paid.
  if (!userId || method === "paypal") {
    try {
      const checkout = await startCheckout({
        amountEUR,
        description: `${qty} more game${qty > 1 ? "s" : ""} · ${order.gameName}`,
        returnPath,
        kind: "EXTRA_GAMES",
        orderId,
        methods: method === "paypal" ? ["paypal"] : ["card"],
        extraMetadata: { quantity: String(qty) },
        guestEmail: order.guestEmail ?? undefined,
        idempotencyKey,
      });
      return { ok: true, redirect: checkout.url };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
    }
  }

  const charged = await chargeDefaultCard({
    amountEUR,
    description: `${qty} more game${qty > 1 ? "s" : ""} · ${order.gameName}`,
    kind: "EXTRA_GAMES",
    orderId,
    idempotencyKey,
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
        returnPath,
        kind: "EXTRA_GAMES",
        orderId,
        methods: ["card"],
        extraMetadata: { quantity: String(qty) },
        idempotencyKey,
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
export async function sendTip(
  orderId: string,
  amountEUR: number,
  method: PaymentMethodKey,
  accessToken?: string | null,
): Promise<ExtraPaymentResult> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const amount = Math.round(Number(amountEUR) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a tip amount." };
  if (amount > MAX_TIP_EUR) return { ok: false, error: `Tips are capped at €${MAX_TIP_EUR}.` };

  // A guest booked without an account and can still want to tip the teammate
  // who just played with them — refusing that helps nobody. Knowing the order
  // id is the capability, same as everywhere else in the guest flow (see the
  // review action). An account-bound order still requires its owner, so a
  // signed-in stranger cannot tip on somebody else's session.
  const order = await authorizeCustomerOrder(orderId, accessToken);
  if (!order || order.status !== "COMPLETED") {
    return { ok: false, error: "You can only tip a session you completed." };
  }
  if (await getTipForOrder(orderId)) return { ok: false, error: "You already tipped this session." };
  const returnPath = order.accessToken
    ? `/order/${encodeURIComponent(order.accessToken)}`
    : `/checkout/matching?order=${orderId}`;

  // Credits are an account balance; a guest has none to spend.
  if (method === "credits" && !userId) {
    return { ok: false, error: "Sign in to pay from your balance, or pay by card or PayPal." };
  }
  if (method === "crypto") return { ok: false, error: "Crypto payments aren't available yet." };

  if (method === "credits") {
    const paid = await spendCredits(amount, `Tip · ${order.gameName}`);
    if (!paid.ok) return { ok: false, error: paid.error ?? "Couldn't pay with credits." };
    await recordTip({ orderId, amountEUR: amount, fromUserId: userId });
    return { ok: true };
  }

  // A guest has no saved card to charge, so there is nothing to try before
  // the hosted page — go straight there and let the webhook record the tip.
  if (!userId || method === "paypal") {
    try {
      const checkout = await startCheckout({
        amountEUR: amount,
        description: `Tip · ${order.gameName}`,
        returnPath,
        kind: "TIP",
        orderId,
        methods: method === "paypal" ? ["paypal"] : ["card"],
        saveCard: false,
        // Taken from the order rather than asked for again: a guest gave it
        // at checkout, and this is the same person on the same session.
        guestEmail: order.guestEmail ?? undefined,
      });
      return { ok: true, redirect: checkout.url };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
    }
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
        returnPath,
        kind: "TIP",
        orderId,
        methods: ["card"],
        saveCard: false,
        // Taken from the order rather than asked for again: a guest gave it
        // at checkout, and this is the same person on the same session.
        guestEmail: order.guestEmail ?? undefined,
      });
      return { ok: true, redirect: checkout.url };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't start the payment." };
    }
  }

  return { ok: false, error: charged.error };
}

/** What the session-complete screen shows instead of the tip buttons. */
export async function loadTip(orderId: string, accessToken?: string | null): Promise<{ amountEUR: number } | null> {
  // Guests can tip now, so they also have to be able to see that they
  // already did — otherwise the buttons come back after a reload and invite
  // a second payment.
  const order = await authorizeCustomerOrder(orderId, accessToken);
  if (!order) return null;
  const tip = await getTipForOrder(orderId);
  return tip ? { amountEUR: Number(tip.amountEUR) } : null;
}
