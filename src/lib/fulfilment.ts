import { prisma } from "@/lib/db";
import { getCheckoutSession, getPaymentIntent, getPaymentMethod } from "@/lib/stripe";
import { activateOrderAfterPayment } from "@/lib/dispatch/create";
import { applyExtraGames } from "@/lib/dispatch/extraGames";
import { recordTip } from "@/lib/tipsServer";
import { grantCreditPackage } from "@/lib/creditsServer";
import { claimFulfilment, claimFulfilmentByStripeId } from "@/lib/chargeFulfilment";
import { Prisma } from "@/generated/prisma/client";
import type { ChargeKindKey } from "@/lib/stripeCheckout";

type ClaimedCharge = Awaited<ReturnType<typeof claimFulfilmentByStripeId>>;

/**
 * Hands out what a payment bought.
 *
 * `charge` is null when somebody else already claimed this payment — the
 * action that took it, an earlier delivery of the same webhook, or the
 * customer's own return from the hosted page — so there is nothing left to
 * do. Everything below therefore runs exactly once per charge.
 */
export async function fulfilClaimed(charge: ClaimedCharge, metadata: Record<string, string>) {
  if (!charge) return;

  switch (metadata.kind ?? charge.kind) {
    case "ORDER": {
      const orderId = metadata.orderId ?? charge.orderId;
      // This is the moment teammates are invited: not when the order was
      // written, but when it was paid for.
      if (orderId) await activateOrderAfterPayment(orderId);
      break;
    }

    case "EXTRA_GAMES": {
      const orderId = metadata.orderId ?? charge.orderId;
      const quantity = Number(metadata.quantity ?? 1);
      if (orderId) await applyExtraGames(orderId, Number.isFinite(quantity) ? quantity : 1);
      break;
    }

    case "TIP": {
      const orderId = metadata.orderId ?? charge.orderId;
      if (orderId) {
        await recordTip({
          orderId,
          amountEUR: Number(charge.amountEUR),
          fromUserId: charge.userId,
          chargeId: charge.id,
        });
      }
      break;
    }

    case "CREDITS": {
      const userId = metadata.userId ?? charge.userId;
      if (userId && metadata.packageId) await grantCreditPackage(userId, metadata.packageId);
      break;
    }

    default:
      break;
  }
}

/**
 * Settles a hosted checkout by asking Stripe about it directly.
 *
 * The webhook is still the thing that guarantees delivery — it arrives even
 * if the customer closes the tab. But it can lag, or be misconfigured, and
 * waiting on it means staring at a spinner right after paying. So the return
 * from Stripe reconciles too: the session is *read back from Stripe*, never
 * trusted from the URL, and the same claim keeps the two from both acting.
 */
export async function settleCheckoutSession(sessionId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;

  const session = await getCheckoutSession(sessionId).catch(() => null);
  if (!session || session.payment_status !== "paid") return false;

  await prisma.charge.updateMany({
    where: { stripeSessionId: session.id, status: { not: "SUCCEEDED" } },
    data: { status: "SUCCEEDED", stripePaymentIntentId: session.payment_intent ?? undefined },
  });

  const metadata = session.metadata ?? {};
  const userId = metadata.userId;
  if (userId && session.customer) {
    await prisma.user
      .update({ where: { id: userId }, data: { stripeCustomerId: session.customer } })
      .catch(() => undefined);
  }
  if (userId && session.payment_intent) {
    await getPaymentIntent(session.payment_intent)
      .then((intent) => (intent.payment_method ? storeCard(userId, intent.payment_method) : undefined))
      .catch(() => undefined);
  }

  await fulfilClaimed(await claimFulfilmentByStripeId({ sessionId: session.id }), metadata);
  return true;
}

/**
 * Settles a payment from the intent's own event.
 *
 * The charge row is written when checkout starts, at which point the intent
 * does not exist yet — so it can only be addressed by what the intent carries
 * about it. Matching falls back to the order (or the account, for a credit
 * topup) and backfills the id, which is what lets an endpoint subscribed to
 * `payment_intent.succeeded` alone still release the order.
 */
export async function settlePaymentIntent(intentId: string, metadata: Record<string, string>) {
  const kind = metadata.kind;
  if (!kind) return;

  let charge = await prisma.charge.findFirst({ where: { stripePaymentIntentId: intentId } });

  if (!charge) {
    charge = await prisma.charge.findFirst({
      where: {
        stripePaymentIntentId: null,
        status: { not: "SUCCEEDED" },
        kind: kind as ChargeKindKey,
        ...(metadata.orderId ? { orderId: metadata.orderId } : {}),
        ...(metadata.userId ? { userId: metadata.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    if (!charge) return;
    await prisma.charge.update({ where: { id: charge.id }, data: { stripePaymentIntentId: intentId } });
  }

  await prisma.charge.update({
    where: { id: charge.id },
    data: { status: "SUCCEEDED", failureMessage: null },
  });

  await fulfilClaimed((await claimFulfilment(charge.id)) ? charge : null, metadata);
}

/** Mirrors a payment method onto the account, ignoring one we already have. */
export async function storeCard(userId: string, paymentMethodId: string) {
  const existing = await prisma.savedCard.findUnique({ where: { stripePaymentMethodId: paymentMethodId } });
  if (existing) return;

  const method = await getPaymentMethod(paymentMethodId);
  if (!method.card) return;

  const count = await prisma.savedCard.count({ where: { userId } });
  await prisma.savedCard.create({
    data: {
      userId,
      stripePaymentMethodId: method.id,
      brand: method.card.brand,
      last4: method.card.last4,
      expMonth: method.card.exp_month,
      expYear: method.card.exp_year,
      // The first card a customer saves becomes the one we charge later.
      isDefault: count === 0,
    } satisfies Prisma.SavedCardUncheckedCreateInput,
  });
}
