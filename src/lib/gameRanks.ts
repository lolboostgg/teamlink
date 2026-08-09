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
 * The bottom of every ladder.
 *
 * Not the absence of a rank — a real option with a real place (index 0 in
 * every numbered ladder) and art of its own, which is why a customer who
 * hasn't placed yet still has an emblem to show. Anywhere a stored rank can
 * be missing should fall back to this rather than printing the word.
 */
export const UNRANKED = "unranked";

/**
 * Each tier's own colour — the metal or gem it is actually named after, so a
 * ladder reads as a ladder rather than a list with icons.
 *
 * Lived inside CheckoutIngameStep, which is why it stopped at checkout: the
 * teammate side had the same eleven ranks and one flat neutral for all of
 * them. Anywhere a rank is shown can ask for it now.
 */
const RANK_COLORS: Record<string, string> = {
  unranked: "#8b8fa3",
  iron: "#8c7a6b",
  bronze: "#c17a4d",
  silver: "#adb7c4",
  gold: "#e8b93f",
  platinum: "#3fd6b8",
  emerald: "#2ecc71",
  diamond: "#4aa8ff",
  master: "#b366ff",
  grandmaster: "#ff4d6d",
  challenger: "#ffd76a",
  radiant: "#ffd76a",
  immortal: "#ff4d6d",
  predator: "#ff4d6d",
  champion: "#b366ff",
};

export function rankColor(rank: string | null | undefined): string | null {
  return rank ? RANK_COLORS[rank] ?? null : null;
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
