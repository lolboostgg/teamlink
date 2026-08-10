import { prisma } from "@/lib/db";

/**
 * The rating figures, read once and shared by everything that quotes them.
 *
 * SERVER ONLY — it touches lib/db. The API route serves it to the client
 * sections; the pages call it directly so the trust widget in the hero can be
 * rendered with real numbers instead of appearing and then correcting itself.
 *
 * It exists because the same claim used to be made twice from two sources:
 * the hero badge said "4.9 out of 5 · Verified Reviews · 2,400+" as a
 * hardcoded string while the database held 29 ratings. One of the two had to
 * go, and it was not going to be the database.
 */

export interface CommunityStats {
  reviews: number;
  averageRating: number | null;
  fiveStar: number;
  distribution: { rating: number; count: number }[];
  completedSessions: number;
  ratedTeammates: {
    id: string;
    name: string;
    avatarUrl: string | null;
    avatarFocusX: number;
    avatarFocusY: number;
    avatarZoom: number;
    rating: number;
    reviewCount: number;
    sessions: number;
  }[];
  recentReviews: {
    id: string;
    rating: number;
    gameName: string;
    option: string;
    teammateName: string;
    teammateAvatarUrl: string | null;
    avatarFocusX: number;
    avatarFocusY: number;
    avatarZoom: number;
    createdAt: string;
  }[];
}

export const EMPTY_COMMUNITY_STATS: CommunityStats = {
  reviews: 0,
  averageRating: null,
  fiveStar: 0,
  distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })),
  completedSessions: 0,
  ratedTeammates: [],
  recentReviews: [],
};

export async function getCommunityStats(): Promise<CommunityStats> {
  const [total, average, byRating, completedSessions, teammates, recentReviews] = await Promise.all([
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], _count: true }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.teammate.findMany({
      // Only teammates somebody has actually rated. A default 5.0 on a
      // teammate with no reviews is a column default, not a reputation.
      where: { reviewsReceived: { some: {} } },
      include: { _count: { select: { reviewsReceived: true } } },
      orderBy: [{ rating: "desc" }],
      take: 6,
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        teammate: { select: { name: true, avatarUrl: true, avatarFocusX: true, avatarFocusY: true, avatarZoom: true } },
        order: { select: { gameName: true, option: true } },
      },
    }),
  ]);

  const counts = new Map(byRating.map((row) => [row.rating, row._count]));

  return {
    reviews: total,
    averageRating: total > 0 ? Math.round((average._avg.rating ?? 0) * 100) / 100 : null,
    fiveStar: counts.get(5) ?? 0,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: counts.get(rating) ?? 0 })),
    completedSessions,
    ratedTeammates: teammates.map((t) => ({
      id: t.id,
      name: t.name,
      avatarUrl: t.avatarUrl,
      avatarFocusX: t.avatarFocusX,
      avatarFocusY: t.avatarFocusY,
      avatarZoom: t.avatarZoom,
      rating: t.rating,
      reviewCount: t._count.reviewsReceived,
      sessions: t.sessionsCount,
    })),
    recentReviews: recentReviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      gameName: review.order.gameName,
      option: review.order.option,
      teammateName: review.teammate.name,
      teammateAvatarUrl: review.teammate.avatarUrl,
      avatarFocusX: review.teammate.avatarFocusX,
      avatarFocusY: review.teammate.avatarFocusY,
      avatarZoom: review.teammate.avatarZoom,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}
