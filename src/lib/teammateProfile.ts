import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import {
  sanitizeGameProfiles,
  EMPTY_GAME_PROFILE,
  type GameProfileMap,
  type GameProfileEntry,
} from "@/lib/gameProfiles";
import type { LolRankTier, ChampionName, LolLane } from "@/lib/lolAssets";

const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));

export interface TeammateProfileInput {
  tagline: string;
  timezone: string;
  avatarUrl: string;
  languages: LanguageCode[];
  gameProfiles: GameProfileMap;
  // Legacy League-only mirror of gameProfiles["league-of-legends"], derived
  // by the sanitizer — never trusted from the client.
  lolRank: LolRankTier | null;
  lolChampions: ChampionName[];
  lolLanes: LolLane[];
}

// What the forms actually submit: the legacy lol* mirror is derived
// server-side by sanitizeTeammateProfileInput, never sent by the client.
export type TeammateProfileClientInput = Omit<TeammateProfileInput, "lolRank" | "lolChampions" | "lolLanes">;

// Shared by both the admin edit form and the teammate self-service form —
// neither trusts client input for the option-ish fields (language, rank,
// role, champion/agent pool): a tampered request could otherwise write
// arbitrary strings into these Json columns.
export function sanitizeTeammateProfileInput(raw: {
  tagline?: string;
  timezone?: string;
  avatarUrl?: string;
  languages?: string[];
  gameProfiles?: unknown;
}): TeammateProfileInput {
  const languages = (raw.languages ?? []).filter((v): v is LanguageCode => LANGUAGE_CODES.has(v as LanguageCode));
  const gameProfiles = sanitizeGameProfiles(raw.gameProfiles);
  const lol: GameProfileEntry = gameProfiles["league-of-legends"] ?? EMPTY_GAME_PROFILE;

  return {
    tagline: (raw.tagline ?? "").trim().slice(0, 240),
    timezone: (raw.timezone ?? "").trim().slice(0, 60),
    avatarUrl: (raw.avatarUrl ?? "").trim().slice(0, 2000),
    languages,
    gameProfiles,
    lolRank: lol.rank,
    lolChampions: lol.pool,
    lolLanes: lol.roles,
  };
}

/**
 * Reads a teammate row's per-game profiles, falling back to the legacy
 * League-only columns for rows written before gameProfiles existed (those
 * stored lanes as display labels — "Top" — hence the lowercasing).
 */
export function readGameProfiles(row: {
  gameProfiles?: unknown;
  lolRank?: string | null;
  lolChampions?: unknown;
  lolLanes?: unknown;
}): GameProfileMap {
  const stored = sanitizeGameProfiles(row.gameProfiles);
  if (Object.keys(stored).length > 0) return stored;

  return sanitizeGameProfiles({
    "league-of-legends": {
      rank: row.lolRank ?? null,
      roles: (Array.isArray(row.lolLanes) ? row.lolLanes : []).map((v) => String(v).toLowerCase()),
      pool: Array.isArray(row.lolChampions) ? row.lolChampions : [],
    },
  });
}
