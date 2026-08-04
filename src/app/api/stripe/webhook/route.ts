import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhook, getPaymentMethod, getPaymentIntent } from "@/lib/stripe";
import { activateOrderAfterPayment } from "@/lib/dispatch/create";
import { applyExtraGames } from "@/lib/dispatch/extraGames";
import { recordTip } from "@/lib/tipsServer";
import { releaseCouponForOrder } from "@/lib/couponsServer";
import { grantCreditPackage } from "@/lib/creditsServer";
import { claimFulfilmentByStripeId } from "@/lib/chargeFulfilment";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Where Stripe tells us money actually moved.
 *
 * The browser being redirected back to a success page is not proof of
 * anything — the customer can close the tab, and the URL can be visited by
 * hand. This endpoint is the only place a charge is marked SUCCEEDED.
 *
 * Every handler is written to be safe on redelivery: Stripe retries for days
 * and will happily send the same event twice.
 */
export async function POST(request: Request) {
  const payload = await request.text();

  if (!verifyWebhook(payload, request.headers.get("stripe-signature"))) {
    // Deliberately terse: an attacker gets no hint about why it failed.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          id: string;
          payment_intent: string | null;
          customer: string | null;
          payment_status: string;
          metadata?: Record<string, string>;
        };
        if (session.payment_status !== "paid") break;

        // The count is the guard against a redelivered event: only the
        // transition into SUCCEEDED may hand out what was bought, so a second
        // delivery of the same event finds nothing to update and stops here.
        const settled = await prisma.charge.updateMany({
          where: { stripeSessionId: session.id, status: { not: "SUCCEEDED" } },
          data: {
            status: "SUCCEEDED",
            stripePaymentIntentId: session.payment_intent ?? undefined,
          },
        });

        // Bind the Stripe customer to the account so later off-session
        // charges have something to bill against.
        const userId = session.metadata?.userId;
        if (userId && session.customer) {
          await prisma.user
            .update({ where: { id: userId }, data: { stripeCustomerId: session.customer } })
            .catch(() => undefined);
        }

        // A hosted checkout's intent carries no metadata of ours, so the
        // card has to be picked up here — otherwise the customer would have
        // "no saved card" for the next tip despite having just paid by card.
        if (userId && session.payment_intent) {
          await getPaymentIntent(session.payment_intent)
            .then((intent) => (intent.payment_method ? storeCard(userId, intent.payment_method) : undefined))
            .catch(() => undefined);
        }

        if (settled.count > 0) {
          await fulfilClaimed(await claimFulfilmentByStripeId({ sessionId: session.id }), session.metadata ?? {});
        }
        break;
      }

      // An abandoned checkout: give the coupon back, and let the parked order
      // go rather than leaving it sitting at AWAITING_PAYMENT forever.
      case "checkout.session.expired": {
        const session = event.data.object as { id: string; metadata?: Record<string, string> };
        await prisma.charge.updateMany({
          where: { stripeSessionId: session.id, status: "PENDING" },
          data: { status: "FAILED", failureMessage: "Checkout expired." },
        });
        const orderId = session.metadata?.orderId;
        if (orderId && session.metadata?.kind === "ORDER") {
          await releaseCouponForOrder(orderId);
          await prisma.order.updateMany({
            where: { id: orderId, status: "AWAITING_PAYMENT" },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object as { id: string; payment_method: string | null; customer: string | null; metadata?: Record<string, string> };
        await prisma.charge.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "SUCCEEDED", failureMessage: null },
        });

        // Covers the off-session charges the app takes itself (tips, extra
        // games): the action usually fulfils them inline, and the claim below
        // makes sure this path only steps in when it didn't get that far.
        // Hosted checkouts carry no metadata on the intent and are handled by
        // the session event above.
        if (intent.metadata?.kind) {
          await fulfilClaimed(await claimFulfilmentByStripeId({ paymentIntentId: intent.id }), intent.metadata);
        }

        // First successful payment for this account: remember the card so it
        // can be charged again without another checkout.
        const userId = intent.metadata?.userId;
        if (userId && intent.payment_method) {
          await storeCard(userId, intent.payment_method).catch(() => undefined);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as {
          id: string;
          metadata?: Record<string, string>;
          last_payment_error?: { message?: string };
        };
        await prisma.charge.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "FAILED", failureMessage: intent.last_payment_error?.message ?? "Payment failed." },
        });
        // A booking that was never paid for shouldn't hold the customer's
        // coupon hostage, nor sit in the dashboard as a live order.
        const orderId = intent.metadata?.orderId;
        if (orderId && (intent.metadata?.kind ?? "ORDER") === "ORDER") {
          await releaseCouponForOrder(orderId);
          await prisma.order.updateMany({
            where: { id: orderId, status: "AWAITING_PAYMENT" },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as { payment_intent: string | null };
        if (charge.payment_intent) {
          await prisma.charge.updateMany({
            where: { stripePaymentIntentId: charge.payment_intent },
            data: { status: "REFUNDED" },
          });
        }
        break;
      }

      default:
        // Unhandled types are acknowledged, not retried — Stripe sends far
        // more than this app cares about.
        break;
    }
  } catch (err) {
    // A 500 makes Stripe retry, which is what we want for a transient
    // database problem.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handling failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

type ClaimedCharge = Awaited<ReturnType<typeof claimFulfilmentByStripeId>>;

/**
 * Hands out what a payment bought.
 *
 * `charge` is null when somebody else already claimed this payment — the
 * action that took it, or an earlier delivery of the same event — so there is
 * nothing left to do. Everything below therefore runs exactly once per charge.
 */
async function fulfilClaimed(charge: ClaimedCharge, metadata: Record<string, string>) {
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

/** Mirrors a payment method onto the account, ignoring one we already have. */
async function storeCard(userId: string, paymentMethodId: string) {
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
