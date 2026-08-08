"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications/service";

export async function submitTeammateReview(orderId: string, teammateId: string, rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choose between one and five stars." } as const;
  }
  const session = await auth();
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      status: "COMPLETED",
      candidates: { some: { teammateId, selected: true } },
    },
  });
  // A guest order has no clientUserId — knowing its id (the capability URL
  // they checked out with) is what proves it's theirs, same as the rest of
  // the guest flow. An account-bound order still requires the owning user.
  if (!order || (order.clientUserId && order.clientUserId !== session?.user?.id)) {
    return { ok: false, error: "This session cannot be reviewed." } as const;
  }
  await prisma.review.upsert({
    where: { orderId },
    create: { orderId, teammateId, clientUserId: order.clientUserId, rating },
    update: { teammateId, clientUserId: order.clientUserId, rating },
  });
  const aggregate = await prisma.review.aggregate({ where: { teammateId }, _avg: { rating: true } });
  const teammate = await prisma.teammate.update({
    where: { id: teammateId },
    data: { rating: aggregate._avg.rating ?? 5 },
    select: { userId: true },
  });

  // A rating moves the teammate's roster average, which decides how often
  // they get dispatched — so it is worth telling them about, not just
  // silently writing.
  if (teammate.userId) {
    await notifyUser(teammate.userId, {
      type: "order.reviewed",
      title: `You got ${rating} star${rating === 1 ? "" : "s"}`,
      body: `A customer rated your ${order.gameName} session.`,
      fields: [
        // The stars drawn out rather than a number: this is read at a glance
        // in a column of other messages, and "4/5" is a figure you have to
        // stop and parse.
        { name: "Rating", value: "⭐".repeat(rating) + "☆".repeat(5 - rating), inline: true },
        { name: "New average", value: (aggregate._avg.rating ?? 5).toFixed(2), inline: true },
        { name: "Order", value: `#${order.orderNo}`, inline: true },
      ],
      href: "/dashboard/teammate",
    });
  }

  return { ok: true } as const;
}

export interface TeammateReviewView {
  id: string;
  rating: number;
  createdAt: number;
  client: string;
  gameName: string;
}

/**
 * The reviews a teammate has actually received.
 *
 * The panel used to read these out of localStorage, so a teammate only ever
 * saw ratings that happened to be written in their own browser — which is
 * none of them, since the customer writes them in theirs.
 */
export async function listMyTeammateReviews(): Promise<TeammateReviewView[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teammate) return [];

  const rows = await prisma.review.findMany({
    where: { teammateId: teammate.id },
    include: { order: { select: { customerLabel: true, gameName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    createdAt: row.createdAt.getTime(),
    client: row.order?.customerLabel ?? "Anonymous",
    gameName: row.order?.gameName ?? "—",
  }));
}
