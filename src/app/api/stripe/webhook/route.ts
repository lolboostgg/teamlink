import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhook, getPaymentIntent } from "@/lib/stripe";
import { releaseCouponForOrder } from "@/lib/couponsServer";
import { claimFulfilmentByStripeId } from "@/lib/chargeFulfilment";
import { fulfilClaimed, settlePaymentIntent, storeCard, authorizePaymentIntent } from "@/lib/fulfilment";

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
        // A guest's checkout only authorises, so it reports back "unpaid"
        // with its intent in requires_capture. That is still money reserved
        // and still an order that should go out to teammates — it is simply
        // not taken yet, and is captured when the session starts.
        let state: "SUCCEEDED" | "AUTHORIZED" | null =
          session.payment_status === "paid" ? "SUCCEEDED" : null;
        if (!state && session.payment_intent) {
          const intent = await getPaymentIntent(session.payment_intent).catch(() => null);
          if (intent?.status === "requires_capture") state = "AUTHORIZED";
        }
        if (!state) break;

        // The count is the guard against a redelivered event: only the
        // transition into a settled state may hand out what was bought, so a
        // second delivery finds nothing to update and stops here.
        const settled = await prisma.charge.updateMany({
          where: { stripeSessionId: session.id, status: { notIn: ["SUCCEEDED", "AUTHORIZED"] } },
          data: {
            status: state,
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
        // Handles both the off-session charges the app takes itself and a
        // hosted checkout whose session event we never see — some endpoints
        // only subscribe to this one. Fulfilment is claimed, so whoever got
        // there first (the action, the session event) still wins.
        await settlePaymentIntent(intent.id, intent.metadata ?? {});

        // First successful payment for this account: remember the card so it
        // can be charged again without another checkout.
        const userId = intent.metadata?.userId;
        if (userId && intent.payment_method) {
          await storeCard(userId, intent.payment_method).catch(() => undefined);
        }
        break;
      }

      // Money went on hold. The guest path's equivalent of succeeded: the
      // order is released to teammates here, and the capture happens when the
      // session starts.
      case "payment_intent.amount_capturable_updated": {
        const intent = event.data.object as { id: string; metadata?: Record<string, string> };
        await authorizePaymentIntent(intent.id, intent.metadata ?? {});
        break;
      }

      // An authorisation that was released rather than captured — normally
      // our own doing when an order ends before it starts, but Stripe also
      // expires an uncaptured intent by itself after seven days.
      case "payment_intent.canceled": {
        const intent = event.data.object as { id: string; metadata?: Record<string, string> };
        await prisma.charge.updateMany({
          where: { stripePaymentIntentId: intent.id, status: { in: ["AUTHORIZED", "PENDING"] } },
          data: { status: "VOIDED" },
        });
        const orderId = intent.metadata?.orderId;
        if (orderId && (intent.metadata?.kind ?? "ORDER") === "ORDER") {
          await releaseCouponForOrder(orderId);
          await prisma.order.updateMany({
            where: { id: orderId, status: { in: ["AWAITING_PAYMENT", "SEARCHING", "CANDIDATES_READY", "SELECTING"] } },
            data: { status: "CANCELLED" },
          });
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
