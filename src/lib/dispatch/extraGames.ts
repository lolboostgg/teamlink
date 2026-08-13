import { after } from "next/server";
import { prisma } from "@/lib/db";
import { teammateCut } from "@/lib/payoutSplit";
import { publish } from "@/lib/events/bus";
import { notifyUser } from "@/lib/notifications/service";
import { Prisma } from "@/generated/prisma/client";

export type ExtraGamesReceipt = {
  alreadyProcessed: boolean;
  customerLabel: string;
  gameName: string;
  gamesBooked: number;
  orderNo: number;
  clientUserId: string | null;
  teammateUserIds: string[];
};

/** Credit debit, fulfilment claim and order extension in one transaction. */
export async function purchaseExtraGamesWithCredits(input: {
  orderId: string;
  userId: string;
  quantity: number;
  idempotencyKey: string;
}): Promise<{ ok: true; receipt: ExtraGamesReceipt } | { ok: false; error: string }> {
  const qty = Math.max(1, Math.min(9, Math.round(input.quantity)));
  if (!input.idempotencyKey) return { ok: false, error: "Invalid purchase." };

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: input.orderId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        include: { candidates: { where: { selected: true }, include: { teammate: { select: { userId: true } } } } },
      });
      if (!order) throw new Error("ORDER_CLOSED");

      const teammateUserIds = order.candidates.map((candidate) => candidate.teammate.userId).filter(Boolean) as string[];
      const existing = await tx.charge.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) {
        if (existing.userId !== input.userId || existing.orderId !== input.orderId) throw new Error("INVALID_PURCHASE");
        return {
          alreadyProcessed: true,
          customerLabel: order.customerLabel,
          gameName: order.gameName,
          gamesBooked: order.gamesBooked,
          orderNo: order.orderNo,
          clientUserId: order.clientUserId,
          teammateUserIds,
        };
      }

      const amountEUR = Math.round(Number(order.unitPriceEUR) * qty * 100) / 100;
      const amountCents = Math.round(amountEUR * 100);
      const debited = await tx.user.updateMany({
        where: { id: input.userId, creditBalanceCents: { gte: amountCents } },
        data: { creditBalanceCents: { decrement: amountCents } },
      });
      if (debited.count !== 1) throw new Error("INSUFFICIENT_BALANCE");

      await tx.creditTransaction.create({
        data: { userId: input.userId, type: "SPEND", amountCents: -amountCents, note: `${qty}x extra game · ${order.gameName}` },
      });
      await tx.charge.create({
        data: {
          userId: input.userId,
          orderId: input.orderId,
          kind: "EXTRA_GAMES",
          status: "SUCCEEDED",
          amountEUR,
          idempotencyKey: input.idempotencyKey,
          fulfilledAt: new Date(),
        },
      });
      const updated = await tx.order.update({
        where: { id: input.orderId },
        data: {
          gamesBooked: { increment: qty },
          priceEUR: { increment: amountEUR },
          teammatePayoutEUR: order.teammatePayoutEUR === null
            ? teammateCut(Number(order.priceEUR) + amountEUR)
            : { increment: teammateCut(amountEUR) },
        },
      });

      return {
        alreadyProcessed: false,
        customerLabel: order.customerLabel,
        gameName: order.gameName,
        gamesBooked: updated.gamesBooked,
        orderNo: order.orderNo,
        clientUserId: order.clientUserId,
        teammateUserIds,
      };
    });
    return { ok: true, receipt };
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") return { ok: false, error: "Not enough credits." };
    if (error instanceof Error && error.message === "ORDER_CLOSED") return { ok: false, error: "This session cannot be extended." };
    if (error instanceof Error && error.message === "INVALID_PURCHASE") return { ok: false, error: "Invalid purchase." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.charge.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing?.userId === input.userId && existing.orderId === input.orderId) {
        return { ok: false, error: "This extra-game purchase was already processed." };
      }
    }
    throw error;
  }
}

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

  const unitPrice = Number(order.unitPriceEUR);
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
    // after(), not await: telling the teammate is not something the customer
    // who just clicked "add games" should be made to wait for. The credits
    // path next door already did this; the card path was still holding the
    // response open for a notification row and a Discord DM per teammate,
    // on top of the Stripe round trip it had just made.
    after(() => Promise.all(userIds.map((userId) =>
      notifyUser(userId, {
        type: "order.games_added",
        title: `${order.customerLabel} added +${qty} game${qty === 1 ? "" : "s"}`,
        body: `${order.gameName} · ${updated.gamesBooked} games total`,
        href: `/dashboard/teammate/session/${order.orderNo}`,
        fields: [
          { name: "Added", value: `+${qty} game${qty === 1 ? "" : "s"}`, inline: true },
          { name: "Total", value: `${updated.gamesBooked} games`, inline: true },
          { name: "Order", value: `#${order.orderNo}`, inline: true },
        ],
      }),
    )));
  }

  await publish({
    topic: "orders",
    key: orderId,
    userIds: [...userIds, ...(order.clientUserId ? [order.clientUserId] : [])],
  });

  return updated;
}
