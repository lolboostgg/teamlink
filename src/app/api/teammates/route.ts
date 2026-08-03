import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Teammate } from "@/lib/teammates";
import type { LanguageCode } from "@/lib/i18n";
import type { LolRankTier, ChampionName, LolLane } from "@/lib/lolAssets";

type LanguagesJson = LanguageCode[];
type GameSlugsJson = string[];

export const dynamic = "force-dynamic";

// Public roster feed — fetched once client-side on app load (see
// TeammatesSync) to seed the shared in-memory TEAMMATES cache in
// lib/teammates.ts with real, admin/teammate-edited data instead of just
// the static seed array. Only available teammates are listed here, same
// rule the rest of the app already applies to who can be matched.
export async function GET() {
  const rows = await prisma.teammate.findMany({
    where: { available: true },
    include: { _count: { select: { reviewsReceived: true } } },
    orderBy: { name: "asc" },
  });

  const teammates: Teammate[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    avatarInitials: t.avatarInitials,
    avatarUrl: t.avatarUrl,
    tagline: t.tagline ?? "",
    languages: (t.languages as LanguagesJson | null) ?? [],
    timezone: t.timezone ?? "",
    rating: t.rating,
    sessions: t.sessionsCount,
    reviewCount: t._count.reviewsReceived,
    gameSlugs: (t.gameSlugs as GameSlugsJson | null) ?? [],
    lolRank: (t.lolRank as LolRankTier | null) ?? undefined,
    lolChampions: (t.lolChampions as ChampionName[] | null) ?? undefined,
    lolLanes: (t.lolLanes as LolLane[] | null) ?? undefined,
  }));

  return NextResponse.json(teammates);
}
