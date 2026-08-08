import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { refundPaymentIntent, stripeConfigured, StripeError } from "@/lib/stripe";
import { notifyAdmins } from "@/lib/notifications/service";
import { notifyOrderCancelled } from "@/lib/notify/orderNotifications";
import { releaseOrderAuthorization } from "@/lib/orderPayments";

/**
 * Giving a cancelled order's money back.
 *
 * There are five ways an order can end without a session happening — the
 * search giving up, the customer cancelling while it runs, an admin pulling
 * it off the board, an assignment nobody ever started, and a teammate
 * approving a cancellation request. Only two of them returned anything
 * before, and only to customers with an account; every other combination
 * cancelled the order and quietly kept the money.
 *
 * Where it goes depends on who paid:
 *
 * - An account gets store credit. It is the same balance every payment
 *   method already settles into, and it lets them rebook immediately, which
 *   is what they wanted. Someone who would rather have it back on their card
 *   is a manual refund by an admin.
 * - A guest has no balance to credit, so it goes back the way it came, as a
 *   Stripe refund raised here rather than left for a person to notice.
 *
 * Nothing here throws at its caller. A cancellation must not fail because a
 * refund did — the order still has to end. What can't be settled is raised to
 * the admins instead, which is the one outcome worse than slow: money owed
 * that nobody knows about.
 */

export type RefundReason = "no_match" | "cancelled_by_customer" | "cancelled_by_admin" | "never_started" | "cancel_approved";

const REASON_TEXT: Record<RefundReason, string> = {
  no_match: "we couldn't find a teammate",
  cancelled_by_customer: "the order was cancelled",
  cancelled_by_admin: "the order was cancelled",
  never_started: "the session never started",
  cancel_approved: "the session was cancelled",
};

export interface RefundableOrder {
  id: string;
  orderNo: number;
  clientUserId: string | null;
  gameName: string;
  priceEUR: Prisma.Decimal | number | string;
}

export interface RefundOutcome {
  /** How much was handed back, in cents. Zero when there was nothing to give. */
  cents: number;
  /** "released" is a hold let go — no money ever moved, and no fee lost. */
  method: "credit" | "stripe" | "released" | "none";
  /** Set when the money could not be returned and an admin was asked to. */
  problem?: string;
}

/**
 * What this order actually cost, in cents. The base price plus any extra
 * games bought during it — a tip is excluded on purpose, since it is for a
 * teammate who did play, and a cancelled order has no tip anyway.
 */
function orderCents(order: RefundableOrder, extraCents: number): number {
  return Math.round(Number(order.priceEUR) * 100) + extraCents;
}

export async function refundOrder(order: RefundableOrder, reason: RefundReason): Promise<RefundOutcome> {
  const charges = await prisma.charge.findMany({
    where: { orderId: order.id, status: "SUCCEEDED", kind: { in: ["ORDER", "EXTRA_GAMES"] } },
    select: { id: true, kind: true, amountEUR: true, stripePaymentIntentId: true },
  });

  const extraCents = charges
    .filter((charge) => charge.kind === "EXTRA_GAMES")
    .reduce((sum, charge) => sum + Math.round(Number(charge.amountEUR) * 100), 0);

  return order.clientUserId
    ? creditBack(order, order.clientUserId, orderCents(order, extraCents), reason)
    : refundToStripe(order, charges);
}

/**
 * Store credit for an account.
 *
 * Balance and ledger move in one transaction, and the ledger's unique
 * (userId, orderId, REFUND) index is what makes a second attempt a no-op
 * rather than a second credit — a cancellation reaching this twice is not
 * hypothetical, two tabs and a retried action both do it.
 */
async function creditBack(
  order: RefundableOrder,
  userId: string,
  cents: number,
  reason: RefundReason,
): Promise<RefundOutcome> {
  if (cents <= 0) return { cents: 0, method: "none" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.creditTransaction.create({
        data: {
          userId,
          orderId: order.id,
          type: "REFUND",
          amountCents: cents,
          note: `Order #${order.orderNo} — ${REASON_TEXT[reason]}`,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { creditBalanceCents: { increment: cents } },
      });
    });
    return { cents, method: "credit" };
  } catch (err) {
    // The unique index rejecting a duplicate is the mechanism working, not a
    // failure — this order has already been paid back.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { cents: 0, method: "none" };
    }
    const problem = err instanceof Error ? err.message : "The balance could not be credited.";
    await raise(order, cents, problem);
    return { cents: 0, method: "none", problem };
  }
}

/**
 * Back to the card or PayPal account for a guest.
 *
 * Idempotency is the Charge row: it is claimed by a conditional update from
 * SUCCEEDED to REFUNDED, and only the caller that actually changed the row
 * goes on to ask Stripe. A refund that then fails puts the row back, so the
 * next attempt — or the admin acting on the alert — still finds something to
 * refund rather than a row that says it is already done.
 */
async function refundToStripe(
  order: RefundableOrder,
  charges: { id: string; amountEUR: Prisma.Decimal; stripePaymentIntentId: string | null }[],
): Promise<RefundOutcome> {
  // Anything still only reserved is let go rather than refunded. Cheaper —
  // Stripe keeps its fee on a refund but takes nothing for a hold that was
  // never captured — and truer, since no money left the customer's account
  // in the first place.
  const released = await releaseOrderAuthorization(order);
  if (released.releasedCents > 0 || released.problem) {
    return {
      cents: released.releasedCents,
      method: released.releasedCents > 0 ? "released" : "none",
      problem: released.problem,
    };
  }

  const payable = charges.filter((charge) => charge.stripePaymentIntentId);
  if (payable.length === 0) {
    // Nothing was taken through Stripe, so there is nothing to send back.
    // A guest cannot pay from a balance, so this is an order that never
    // completed its payment at all.
    return { cents: 0, method: "none" };
  }

  if (!stripeConfigured()) {
    const cents = payable.reduce((sum, c) => sum + Math.round(Number(c.amountEUR) * 100), 0);
    const problem = "Stripe isn't configured in this deployment.";
    await raise(order, cents, problem);
    return { cents: 0, method: "none", problem };
  }

  let refunded = 0;
  let problem: string | undefined;
  let owed = 0;

  for (const charge of payable) {
    const cents = Math.round(Number(charge.amountEUR) * 100);
    const claimed = await prisma.charge.updateMany({
      where: { id: charge.id, status: "SUCCEEDED" },
      data: { status: "REFUNDED" },
    });
    if (claimed.count === 0) continue; // Somebody else already refunded it.

    try {
      await refundPaymentIntent({
        paymentIntentId: charge.stripePaymentIntentId!,
        reason: "requested_by_customer",
        // The charge row's id: however often this is retried, Stripe only
        // ever creates the one refund.
        idempotencyKey: `refund_${charge.id}`,
      });
      refunded += cents;
    } catch (err) {
      await prisma.charge.update({ where: { id: charge.id }, data: { status: "SUCCEEDED" } });
      owed += cents;
      problem = err instanceof StripeError ? err.message : "Stripe refused the refund.";
    }
  }

  if (owed > 0) await raise(order, owed, problem ?? "The refund did not go through.");
  return { cents: refunded, method: refunded > 0 ? "stripe" : "none", problem };
}

const REFUND_TEXT: Record<RefundReason, string> = {
  no_match: "We couldn't find a teammate for this one, so we've cancelled it.",
  cancelled_by_customer: "Your order has been cancelled as requested.",
  cancelled_by_admin: "We've had to cancel this order.",
  never_started: "Your teammate never started the session, so we've cancelled the order.",
  cancel_approved: "Your session has been cancelled.",
};

function moneyLine(outcome: RefundOutcome): string | null {
  if (outcome.cents <= 0) return null;
  const amount = `€${(outcome.cents / 100).toFixed(2)}`;
  if (outcome.method === "credit") {
    return `${amount} is back in your balance as credit, ready for your next booking.`;
  }
  // Never charged, only reserved — saying "refunded" would have the customer
  // watching for money that is not coming, because it never left.
  if (outcome.method === "released") {
    return `The ${amount} hold on your card has been released — you were never charged.`;
  }
  return `${amount} has been refunded to your original payment method.`;
}

/**
 * Ends a paid order: gives the money back and tells the customer where it
 * went, in one call.
 *
 * Every cancellation path uses this rather than deciding for itself, which is
 * how they stopped disagreeing — before, two of five refunded, one told the
 * admins, and the rest kept the money in silence.
 *
 * Call it *after* the status change has committed. It talks to Stripe and to
 * a mail server, neither of which belongs inside a database transaction.
 */
export async function settleCancelledOrder(
  order: RefundableOrder,
  reason: RefundReason,
): Promise<RefundOutcome> {
  const outcome = await refundOrder(order, reason);
  await notifyOrderCancelled(order.id, {
    reason: REFUND_TEXT[reason],
    // A refund that failed was already raised to the admins; promising the
    // customer money that hasn't moved would be the wrong thing to say.
    refund: outcome.problem ? null : moneyLine(outcome),
  });
  return outcome;
}

/**
 * Money that is owed and could not be moved. Raised loudly rather than
 * logged — a customer has paid for a session that will not happen, and
 * nothing else in the system will notice on its own.
 */
async function raise(order: RefundableOrder, cents: number, problem: string): Promise<void> {
  try {
    await notifyAdmins({
      type: "order.refund_due",
      title: `Refund needs a hand · €${(cents / 100).toFixed(2)}`,
      body: `Order #${order.orderNo} (${order.gameName}) was cancelled and the automatic refund failed: ${problem} Refund it in Stripe.`,
      href: `/dashboard/admin/orders/${order.id}`,
    });
  } catch {
    // The alert failing must not take the cancellation down with it.
  }
}
