import { prisma } from "@/lib/db";

/**
 * Everything the admin account page shows for one user — the account row,
 * its teammate profile (if any) and the counters for the overview tiles.
 */
export async function getAccountDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teammate: true },
  });
  if (!user) return null;

  const [orderCount, completedCount, reviewAgg] = await Promise.all([
    prisma.order.count({ where: { clientUserId: user.id } }),
    prisma.order.count({ where: { clientUserId: user.id, status: "COMPLETED" } }),
    user.teammate
      ? prisma.review.aggregate({
          where: { teammateId: user.teammate.id },
          _avg: { rating: true },
          _count: true,
        })
      : null,
  ]);

  return {
    user,
    teammate: user.teammate,
    orderCount,
    completedCount,
    reviewCount: reviewAgg?._count ?? 0,
    reviewAverage: reviewAgg?._avg.rating ?? null,
  };
}
