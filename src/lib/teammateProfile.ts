import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { RANK_TIERS, CHAMPION_NAMES, LOL_LANES, type LolRankTier, type ChampionName, type LolLane } from "@/lib/lolAssets";

const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));
const RANK_TIER_SET = new Set(RANK_TIERS.map((r) => r.tier));
const CHAMPION_SET = new Set<string>(CHAMPION_NAMES);
const LANE_SET = new Set<string>(LOL_LANES);

export interface TeammateProfileInput {
  tagline: string;
  timezone: string;
  avatarUrl: string;
  languages: LanguageCode[];
  lolRank: LolRankTier | null;
  lolChampions: ChampionName[];
  lolLanes: LolLane[];
}

// Shared by both the admin edit form and the teammate self-service form —
// neither trusts client input for the enum-ish fields (language/rank/
// champion/lane): a tampered request could otherwise write arbitrary
// strings into these Json columns.
export function sanitizeTeammateProfileInput(raw: {
  tagline?: string;
  timezone?: string;
  avatarUrl?: string;
  languages?: string[];
  lolRank?: string | null;
  lolChampions?: string[];
  lolLanes?: string[];
}): TeammateProfileInput {
  const languages = (raw.languages ?? []).filter((v): v is LanguageCode => LANGUAGE_CODES.has(v as LanguageCode));
  const lolChampions = (raw.lolChampions ?? []).filter((v): v is ChampionName => CHAMPION_SET.has(v));
  const lolLanes = (raw.lolLanes ?? []).filter((v): v is LolLane => LANE_SET.has(v));
  const lolRank = raw.lolRank && RANK_TIER_SET.has(raw.lolRank as LolRankTier) ? (raw.lolRank as LolRankTier) : null;

  return {
    tagline: (raw.tagline ?? "").trim().slice(0, 240),
    timezone: (raw.timezone ?? "").trim().slice(0, 60),
    avatarUrl: (raw.avatarUrl ?? "").trim().slice(0, 2000),
    languages,
    lolRank,
    lolChampions,
    lolLanes,
  };
}
