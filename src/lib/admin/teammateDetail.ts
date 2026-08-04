import { prisma } from "@/lib/db";

/**
 * One teammate for the admin profile page, addressed by roster number.
 * Works for roster rows that were never linked to a user account — those
 * simply have no account-side data.
 */
export async function getTeammateDetail(teammateNo: number) {
  const teammate = await prisma.teammate.findUnique({
    where: { teammateNo },
    include: {
      user: true,
      verification: true,
      payoutMethods: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!teammate) return null;

  const [candidacies, reviewAgg] = await Promise.all([
    prisma.dispatchCandidate.findMany({
      where: { teammateId: teammate.id },
      include: { order: { include: { clientUser: true } } },
      orderBy: { order: { createdAt: "desc" } },
      take: 25,
    }),
    prisma.review.aggregate({
      where: { teammateId: teammate.id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  return {
    teammate,
    candidacies,
    reviewCount: reviewAgg._count,
    reviewAverage: reviewAgg._avg.rating,
  };
}
