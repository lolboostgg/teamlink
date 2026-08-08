import { prisma } from "@/lib/db";

/**
 * One teammate for the admin profile page, addressed by roster number.
 * Works for roster rows that were never linked to a user account — those
 * simply have no account-side data.
 */
/**
 * One teammate, by their roster number (#12) or by their raw id.
 *
 * The number is what the URLs carry; the id is the fallback so an older link,
 * a notification written before the switch, or an internal redirect still
 * resolves instead of 404ing. Same trade getAccountDetail makes.
 */
export async function getTeammateDetail(noOrId: number | string) {
  const teammateNo = Number(noOrId);
  const teammate = await prisma.teammate.findUnique({
    where: Number.isInteger(teammateNo) && teammateNo > 0 ? { teammateNo } : { id: String(noOrId) },
    include: {
      user: true,
      verification: true,
      payoutMethods: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!teammate) return null;

  const [candidacies, reviewAgg, reviews] = await Promise.all([
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
    prisma.review.findMany({
      where: { teammateId: teammate.id },
      include: { order: true, clientUser: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    teammate,
    candidacies,
    reviews,
    reviewCount: reviewAgg._count,
    reviewAverage: reviewAgg._avg.rating,
  };
}
