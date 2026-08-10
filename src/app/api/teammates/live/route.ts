import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PRESENCE_MAX_AGE_MS } from "@/lib/dispatch/presence";
import type { GameProfileMap } from "@/lib/gameProfiles";
import { ranksForGame } from "@/lib/gameRanks";

export const dynamic = "force-dynamic";

/**
 * Who could actually take an order in one game, right now.
 *
 * Not the full roster feed (/api/teammates, which seeds the client cache with
 * everyone listed) — this is the shorter, harder question the booking page
 * asks: switch on, listed for this game, and seen recently enough to answer a
 * dispatch. Exactly the test the pool builder applies, because a page
 * promising seven teammates the dispatcher would not invite is worse than a
 * page promising nothing.
 *
 * Every number here is read, never composed: the rating is the average of the
 * reviews that teammate received, the review count is how many there are, and
 * the rank is what they entered for this game.
 */

export interface LiveTeammate {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
  /** Their own entered rank for this game, or null if they left it blank. */
  rank: string | null;
  rating: number;
  reviewCount: number;
  sessions: number;
  /** Minutes since their panel last checked in — "active 2m ago". */
  seenMinutesAgo: number | null;
}

export interface LiveRosterResponse {
  /** Everyone who could take an order in this game right now. */
  online: number;
  /** The strongest rank held by anyone online, or null if none entered one. */
  topRank: string | null;
  /** A sample of them, best-reviewed first. */
  teammates: LiveTeammate[];
  /** Average across the sample's reviewed teammates, or null if none are. */
  averageRating: number | null;
  totalReviews: number;
}

// Five faces in the stack before it collapses to "+N" — enough to read as a
// group, few enough that the overlap stays legible at 32px.
const SAMPLE_SIZE = 5;

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("game")?.trim().slice(0, 60);
  if (!slug) return NextResponse.json({ error: "A game is required." }, { status: 400 });

  const cutoff = new Date(Date.now() - PRESENCE_MAX_AGE_MS);
  const rows = await prisma.teammate.findMany({
    where: { available: true, lastSeenAt: { gte: cutoff } },
    include: { _count: { select: { reviewsReceived: true } } },
  });

  // gameSlugs is a JSON array, so "listed for this game" cannot be a query
  // predicate — the online roster is small and the filter happens here, the
  // same way lib/gameAvailability.ts and the pool builder both do it.
  const listed = rows.filter((row) => {
    const slugs = Array.isArray(row.gameSlugs) ? row.gameSlugs : [];
    return slugs.includes(slug);
  });

  const sample = listed
    // Best-reviewed first, and among equals whoever has played more. A
    // brand-new teammate with no reviews sorts last rather than showing a
    // default 5.0 at the top of the page.
    .sort((a, b) => b._count.reviewsReceived - a._count.reviewsReceived || b.rating - a.rating)
    .slice(0, SAMPLE_SIZE);

  // The strongest rank anyone online holds, so the panel can say what the
  // stack is worth rather than only how big it is. Ladder position comes from
  // the game's own rank list, which is ordered.
  const ladder = ranksForGame(slug).map((option) => option.value);
  const topRank =
    listed
      .map((row) => ((row.gameProfiles as GameProfileMap | null) ?? {})[slug]?.rank ?? null)
      .filter((rank): rank is string => rank !== null && ladder.includes(rank))
      .sort((a, b) => ladder.indexOf(b) - ladder.indexOf(a))[0] ?? null;

  const now = Date.now();
  const teammates: LiveTeammate[] = sample.map((row) => {
    const profiles = (row.gameProfiles as GameProfileMap | null) ?? {};
    return {
      id: row.id,
      name: row.name,
      avatarUrl: row.avatarUrl,
      avatarFocusX: row.avatarFocusX,
      avatarFocusY: row.avatarFocusY,
      avatarZoom: row.avatarZoom,
      rank: profiles[slug]?.rank ?? null,
      rating: row.rating,
      reviewCount: row._count.reviewsReceived,
      sessions: row.sessionsCount,
      seenMinutesAgo: row.lastSeenAt ? Math.max(0, Math.round((now - row.lastSeenAt.getTime()) / 60_000)) : null,
    };
  });

  // Averaged over the reviewed ones only. Folding in a teammate with no
  // reviews at their default 5.0 would quietly inflate the figure.
  const reviewed = listed.filter((row) => row._count.reviewsReceived > 0);
  const totalReviews = reviewed.reduce((sum, row) => sum + row._count.reviewsReceived, 0);
  const averageRating =
    totalReviews > 0
      ? reviewed.reduce((sum, row) => sum + row.rating * row._count.reviewsReceived, 0) / totalReviews
      : null;

  return NextResponse.json({
    online: listed.length,
    topRank,
    teammates,
    averageRating: averageRating === null ? null : Math.round(averageRating * 10) / 10,
    totalReviews,
  } satisfies LiveRosterResponse);
}
