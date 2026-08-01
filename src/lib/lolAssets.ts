// Real lolboost.gg League of Legends icon art (public/lol/), curated subset
// with clean filenames. Used by RankBadge/ChampionIconRow for teammate cards
// and booking options.
export type LolRankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "challenger";

export interface RankTierMeta {
  tier: LolRankTier;
  label: string;
  icon: string;
}

export const RANK_TIERS: RankTierMeta[] = [
  { tier: "bronze", label: "Bronze", icon: "/lol/ranks/bronze-i.png" },
  { tier: "silver", label: "Silver", icon: "/lol/ranks/silver-iii.png" },
  { tier: "gold", label: "Gold", icon: "/lol/ranks/gold-ii.png" },
  { tier: "platinum", label: "Platinum", icon: "/lol/ranks/platinum-iv.png" },
  { tier: "diamond", label: "Diamond", icon: "/lol/ranks/diamond-i.png" },
  { tier: "master", label: "Master", icon: "/lol/ranks/master.png" },
  { tier: "challenger", label: "Challenger", icon: "/lol/ranks/challenger.png" },
];

const RANK_BY_TIER = new Map(RANK_TIERS.map((r) => [r.tier, r]));

export function getRankMeta(tier: LolRankTier): RankTierMeta {
  return RANK_BY_TIER.get(tier) ?? RANK_TIERS[0];
}

export const CHAMPION_NAMES = ["Ahri", "Ashe", "Ezreal", "Garen", "Katarina", "Lux", "Teemo", "Vayne"] as const;
export type ChampionName = (typeof CHAMPION_NAMES)[number];

export function championIcon(name: ChampionName): string {
  return `/lol/champions/${name}.png`;
}
