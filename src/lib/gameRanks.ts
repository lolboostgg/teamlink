import { getGameProfileConfig, type ProfileOption } from "@/lib/gameProfiles";

/**
 * The customer's own rank, asked alongside their IGN.
 *
 * Reuses the same ladders the teammate profiles use, so "Emerald" means the
 * same thing on both sides and the icons match.
 */
export const DIVISIONS = ["IV", "III", "II", "I"] as const;
export type Division = (typeof DIVISIONS)[number];

/**
 * Tiers that are a single bracket with no sub-divisions. Riot's apex tiers
 * are ranked by LP alone, and Unranked has nothing to divide.
 */
const WITHOUT_DIVISIONS = new Set([
  "unranked",
  "master",
  "grandmaster",
  "challenger",
  "radiant",
  "immortal",
  "predator",
  "champion",
]);

export function ranksForGame(gameSlug: string): ProfileOption[] {
  return getGameProfileConfig(gameSlug)?.ranks?.options ?? [];
}

export function rankHasDivisions(rank: string | null): boolean {
  if (!rank) return false;
  return !WITHOUT_DIVISIONS.has(rank.toLowerCase());
}

/**
 * The rank's own artwork, where the game has any.
 *
 * A rank badge is the thing a teammate actually reads on an incoming request
 * — it decides whether the order is one they want at all — and a word in a
 * list is far slower to take in than the emblem they already know from the
 * client. Null for games we hold no art for; the label stays the fallback.
 */
export function rankIcon(gameSlug: string, rank: string | null): string | null {
  if (!rank) return null;
  return ranksForGame(gameSlug).find((option) => option.value === rank)?.icon ?? null;
}

/** "Gold IV", or just "Master" where divisions don't apply. */
export function formatRank(gameSlug: string, rank: string | null, division: string | null): string | null {
  if (!rank) return null;
  const label = ranksForGame(gameSlug).find((option) => option.value === rank)?.label ?? rank;
  return rankHasDivisions(rank) && division ? `${label} ${division}` : label;
}
