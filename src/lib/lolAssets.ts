// Thin League-of-Legends view over the per-game registry in gameProfiles.ts,
// kept because the matchmaking surfaces (teammate cards, details panel,
// session screen) only ever show League art. Everything here is derived —
// edit the League entry in gameProfiles.ts, not this file.
import { GAME_PROFILES, championIconUrl, type ProfileOption } from "@/lib/gameProfiles";

const LOL = GAME_PROFILES["league-of-legends"];

export type LolRankTier = string;
export type ChampionName = string;
export type LolLane = string;

export interface RankTierMeta {
  tier: LolRankTier;
  label: string;
  icon: string;
}

export const RANK_TIERS: RankTierMeta[] = (LOL.ranks?.options ?? []).map((r: ProfileOption) => ({
  tier: r.value,
  label: r.label,
  icon: r.icon ?? "",
}));

const RANK_BY_TIER = new Map(RANK_TIERS.map((r) => [r.tier, r]));

export function getRankMeta(tier: LolRankTier): RankTierMeta {
  return RANK_BY_TIER.get(tier) ?? RANK_TIERS[0];
}

export const CHAMPION_NAMES: string[] = (LOL.pool?.options ?? []).map((c) => c.value);

export function championIcon(name: ChampionName): string {
  return championIconUrl(name);
}

export const LOL_LANES: string[] = (LOL.roles?.options ?? []).map((r) => r.label);
