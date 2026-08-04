import { prisma } from "@/lib/db";

/**
 * Claims the right to hand out what a charge paid for.
 *
 * Two paths can learn about the same successful payment: the action that
 * charged the saved card and got an answer straight away, and Stripe's
 * webhook a moment later. Both call this first; the conditional update means
 * exactly one of them gets `true`, so nobody's games are added twice.
 */
export async function claimFulfilment(chargeId: string): Promise<boolean> {
  const claimed = await prisma.charge.updateMany({
    where: { id: chargeId, fulfilledAt: null },
    data: { fulfilledAt: new Date() },
  });
  return claimed.count === 1;
}

/** Same claim, addressed by whichever Stripe id the event carries. */
export async function claimFulfilmentByStripeId(input: {
  sessionId?: string | null;
  paymentIntentId?: string | null;
}) {
  const charge = await prisma.charge.findFirst({
    where: {
      OR: [
        ...(input.sessionId ? [{ stripeSessionId: input.sessionId }] : []),
        ...(input.paymentIntentId ? [{ stripePaymentIntentId: input.paymentIntentId }] : []),
      ],
    },
  });
  if (!charge) return null;
  return (await claimFulfilment(charge.id)) ? charge : null;
}
