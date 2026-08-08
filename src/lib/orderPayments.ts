import { prisma } from "@/lib/db";
import { capturePaymentIntent, cancelPaymentIntent, stripeConfigured, StripeError } from "@/lib/stripe";
import { notifyAdmins } from "@/lib/notifications/service";

/**
 * Taking, or letting go of, money that was only reserved.
 *
 * A guest's booking is authorised at checkout rather than charged (see
 * startCheckout). That leaves two things to do later: capture it when the
 * session actually starts, or release it when the order ends without one.
 *
 * The point of the split is the processing fee. Stripe keeps its cut when a
 * payment is refunded, so a guest order that never became a session used to
 * cost the fee on money we handed straight back. A released authorisation was
 * never a payment, so there is no fee to lose.
 *
 * Accounts are charged outright and never reach any of this — their
 * cancellations end in store credit, so no refund is raised in the first
 * place.
 */

export type CaptureResult = { ok: true; capturedCents: number } | { ok: false; error: string };

/**
 * Takes the money for an order that is about to start.
 *
 * Returns ok for an order with nothing to capture, which is the ordinary case:
 * an account paid up front, or paid from credit, and has no authorisation
 * waiting. The caller uses this as a gate, so "nothing to do" has to read as
 * success rather than as a reason to refuse the session.
 *
 * A capture that fails is the reason the gate exists. The card was good
 * enough to authorise and is not good enough now — cancelled, frozen,
 * expired — and the session must not start on it. Better a teammate who
 * waited than a session played for nothing.
 */
export async function captureOrderPayment(orderId: string): Promise<CaptureResult> {
  const held = await prisma.charge.findMany({
    where: { orderId, status: "AUTHORIZED", stripePaymentIntentId: { not: null } },
    select: { id: true, amountEUR: true, stripePaymentIntentId: true },
  });
  if (held.length === 0) return { ok: true, capturedCents: 0 };

  if (!stripeConfigured()) return { ok: false, error: "Payments aren't configured." };

  let capturedCents = 0;
  for (const charge of held) {
    // Claimed first, so two teammates hitting start at once cannot both send
    // a capture. Whoever loses the update finds nothing left to capture.
    const claimed = await prisma.charge.updateMany({
      where: { id: charge.id, status: "AUTHORIZED" },
      data: { status: "SUCCEEDED" },
    });
    if (claimed.count === 0) continue;

    try {
      await capturePaymentIntent({
        paymentIntentId: charge.stripePaymentIntentId as string,
        idempotencyKey: `capture_${charge.id}`,
      });
      capturedCents += Math.round(Number(charge.amountEUR) * 100);
    } catch (err) {
      // Put it back: the money is still only reserved, and the next attempt
      // has to find something to capture rather than a row claiming it is
      // already paid.
      const message = err instanceof StripeError ? err.message : "The payment could not be taken.";
      await prisma.charge.update({
        where: { id: charge.id },
        data: { status: "AUTHORIZED", failureMessage: message },
      });
      return { ok: false, error: message };
    }
  }

  return { ok: true, capturedCents };
}

/**
 * Releases whatever is still only reserved on an order.
 *
 * Called from the refund path, which checks this before reaching for an
 * actual refund — there is nothing to refund on money that was never taken.
 * Returns how much was let go, so the caller can tell the customer the truth
 * about what happened rather than promising a refund that has no charge
 * behind it.
 */
export async function releaseOrderAuthorization(order: {
  id: string;
  orderNo: number;
  gameName: string;
}): Promise<{ releasedCents: number; problem?: string }> {
  const held = await prisma.charge.findMany({
    where: { orderId: order.id, status: "AUTHORIZED", stripePaymentIntentId: { not: null } },
    select: { id: true, amountEUR: true, stripePaymentIntentId: true },
  });
  if (held.length === 0) return { releasedCents: 0 };

  if (!stripeConfigured()) return { releasedCents: 0, problem: "Stripe isn't configured." };

  let releasedCents = 0;
  let problem: string | undefined;

  for (const charge of held) {
    const claimed = await prisma.charge.updateMany({
      where: { id: charge.id, status: "AUTHORIZED" },
      data: { status: "VOIDED" },
    });
    if (claimed.count === 0) continue;

    try {
      await cancelPaymentIntent({
        paymentIntentId: charge.stripePaymentIntentId as string,
        idempotencyKey: `void_${charge.id}`,
      });
      releasedCents += Math.round(Number(charge.amountEUR) * 100);
    } catch (err) {
      await prisma.charge.update({ where: { id: charge.id }, data: { status: "AUTHORIZED" } });
      problem = err instanceof StripeError ? err.message : "The hold could not be released.";
    }
  }

  // Worth telling somebody, but it is not the emergency a failed refund is:
  // an uncaptured authorisation lapses on its own within a week, so the
  // customer gets their headroom back either way.
  if (problem) {
    await notifyAdmins({
      type: "order.refund_due",
      title: `Couldn't release a hold · ${order.gameName}`,
      body: `Order #${order.orderNo} was cancelled but its authorisation is still open: ${problem} It expires by itself within seven days; cancel it in Stripe to free it sooner.`,
      href: `/dashboard/admin/orders/${order.id}`,
    }).catch(() => undefined);
  }

  return { releasedCents, problem };
}
