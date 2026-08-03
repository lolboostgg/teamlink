import { prisma } from "@/lib/db";

/**
 * Everything the admin account page shows for one user — the account row,
 * its teammate profile (if any) and the counters for the overview tiles.
 */
export async function getAccountDetail(idOrNumber: string) {
  // Profile URLs use the human account number (#813); the cuid still works
  // as a fallback so older links and internal redirects keep resolving.
  const accountNo = Number(idOrNumber);
  const user = await prisma.user.findUnique({
    where: Number.isInteger(accountNo) && accountNo > 0 ? { accountNo } : { id: idOrNumber },
    include: {
      teammate: {
        include: { verification: true, payoutMethods: { orderBy: { createdAt: "asc" } } },
      },
    },
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
