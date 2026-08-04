import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhook, getPaymentMethod } from "@/lib/stripe";
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

        await prisma.charge.updateMany({
          where: { stripeSessionId: session.id },
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
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object as { id: string; payment_method: string | null; customer: string | null; metadata?: Record<string, string> };
        await prisma.charge.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "SUCCEEDED", failureMessage: null },
        });

        // First successful payment for this account: remember the card so it
        // can be charged again without another checkout.
        const userId = intent.metadata?.userId;
        if (userId && intent.payment_method) {
          await storeCard(userId, intent.payment_method).catch(() => undefined);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as { id: string; last_payment_error?: { message?: string } };
        await prisma.charge.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "FAILED", failureMessage: intent.last_payment_error?.message ?? "Payment failed." },
        });
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
