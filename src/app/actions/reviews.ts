"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function submitTeammateReview(orderId: string, teammateId: string, rating: number) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Please sign in to leave a review." } as const;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choose between one and five stars." } as const;
  }
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      clientUserId: session.user.id,
      status: "COMPLETED",
      candidates: { some: { teammateId, selected: true } },
    },
  });
  if (!order) return { ok: false, error: "This session cannot be reviewed." } as const;
  await prisma.review.upsert({
    where: { orderId },
    create: { orderId, teammateId, clientUserId: session.user.id, rating },
    update: { teammateId, clientUserId: session.user.id, rating },
  });
  const aggregate = await prisma.review.aggregate({ where: { teammateId }, _avg: { rating: true } });
  await prisma.teammate.update({
    where: { id: teammateId },
    data: { rating: aggregate._avg.rating ?? 5 },
  });
  return { ok: true } as const;
}
