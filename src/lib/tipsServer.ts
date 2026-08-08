import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications/service";
import { publish } from "@/lib/events/bus";

/**
 * Recording a tip.
 *
 * A tip is money the teammate keeps in full, so it lands in the same ledger
 * their session payouts do — the `Tip` row is the receipt, the
 * `TeammateEarning` row is what moves the balance. Both are written in one
 * transaction, and the unique key on the order makes a redelivered webhook
 * or a double-clicked button a no-op rather than a second payout.
 */
export async function recordTip(input: {
  orderId: string;
  amountEUR: number;
  fromUserId: string | null;
  chargeId?: string | null;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      candidates: {
        where: { selected: true, isPrimary: true },
        include: { teammate: { select: { userId: true } } },
      },
    },
  });
  const teammateId = order?.candidates[0]?.teammateId;
  if (!order || !teammateId) return null;

  const existing = await prisma.tip.findUnique({ where: { orderId: input.orderId } });
  if (existing) return existing;

  const teammateUserId = order.candidates[0]?.teammate.userId ?? null;

  const tip = await prisma.$transaction(async (tx) => {
    const tip = await tx.tip.create({
      data: {
        orderId: input.orderId,
        teammateId,
        fromUserId: input.fromUserId,
        amountEUR: input.amountEUR,
        chargeId: input.chargeId ?? null,
      },
    });

    await tx.teammateEarning.create({
      data: {
        teammateId,
        orderId: input.orderId,
        type: "TIP",
        amountEUR: input.amountEUR,
        note: `Tip · ${order.gameName}`,
      },
    });

    await tx.teammate.update({
      where: { id: teammateId },
      data: { balanceEUR: { increment: input.amountEUR } },
    });

    return tip;
  });

  // Outside the transaction: the money is already booked, and a notification
  // that fails must not roll a paid tip back. Routed through notifyUser, so
  // the channel policy decides where it goes — see notify/channels.ts.
  if (teammateUserId) {
    // Wakes the teammate's own screens: the balance in the sidebar reads
    // itself on this topic, and a tip is the one balance change that happens
    // while they are sitting there watching it.
    await publish({ topic: "orders", key: input.orderId, userIds: [teammateUserId] });
    await notifyUser(teammateUserId, {
      type: "tip.received",
      title: `You got a €${input.amountEUR.toFixed(2)} tip`,
      body: `${order.customerLabel} tipped you for the ${order.gameName} session. It's already on your balance.`,
      href: "/dashboard/teammate/payments",
    });
  }

  return tip;
}

export async function getTipForOrder(orderId: string) {
  return prisma.tip.findUnique({ where: { orderId } });
}
