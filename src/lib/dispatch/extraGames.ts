import { prisma } from "@/lib/db";
import { teammateCut } from "@/lib/payoutSplit";
import { publish } from "@/lib/events/bus";

/**
 * Adds games to a live order once they are paid for.
 *
 * Called from the action when a saved card goes through immediately, and from
 * the webhook when the customer had to finish a hosted checkout instead — so
 * it takes the quantity and nothing about how it was paid.
 */
export async function applyExtraGames(orderId: string, quantity: number) {
  const qty = Math.max(1, Math.min(9, Math.round(quantity)));
  const order = await prisma.order.findFirst({
    where: { id: orderId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    include: { candidates: { where: { selected: true }, include: { teammate: true } } },
  });
  if (!order) return null;

  const unitPrice = Number(order.priceEUR) / Math.max(1, order.gamesBooked);
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      gamesBooked: { increment: qty },
      priceEUR: { increment: unitPrice * qty },
      // Extra games pay the same fixed share as the original booking.
      teammatePayoutEUR:
        order.teammatePayoutEUR === null
          ? teammateCut(Number(order.priceEUR) + unitPrice * qty)
          : { increment: teammateCut(unitPrice * qty) },
    },
  });

  const userIds = order.candidates.map((candidate) => candidate.teammate.userId).filter(Boolean) as string[];
  if (userIds.length > 0) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: "order.games_added",
        title: `${order.customerLabel} booked ${qty === 1 ? "one more game" : `${qty} more games`}`,
        body: `${order.gameName} · ${updated.gamesBooked} games total`,
        href: `/dashboard/teammate/session/${order.id}`,
      })),
    });
  }

  await publish({
    topic: "orders",
    key: orderId,
    userIds: [...userIds, ...(order.clientUserId ? [order.clientUserId] : [])],
  });

  return updated;
}
