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

/** "Gold IV", or just "Master" where divisions don't apply. */
export function formatRank(gameSlug: string, rank: string | null, division: string | null): string | null {
  if (!rank) return null;
  const label = ranksForGame(gameSlug).find((option) => option.value === rank)?.label ?? rank;
  return rankHasDivisions(rank) && division ? `${label} ${division}` : label;
}
