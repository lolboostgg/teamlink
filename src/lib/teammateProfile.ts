import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { DEFAULT_FRAME, MAX_ZOOM, MIN_ZOOM, clampPercent } from "@/lib/avatarFrame";
import {
  sanitizeGameProfiles,
  EMPTY_GAME_PROFILE,
  type GameProfileMap,
  type GameProfileEntry,
} from "@/lib/gameProfiles";
import type { LolRankTier, ChampionName, LolLane } from "@/lib/lolAssets";
import { GAMES } from "@/lib/games";

const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));
const GAME_SLUGS = new Set(GAMES.map((game) => game.slug));
const MAX_AVATAR_DATA_URL_LENGTH = 60_000;

function sanitizeAvatarUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (value.startsWith("data:image/")) {
    return value.length <= MAX_AVATAR_DATA_URL_LENGTH ? value : "";
  }
  return value.slice(0, 2000);
}

export interface TeammateProfileInput {
  tagline: string;
  timezone: string;
  avatarUrl: string;
  /** Where the picture sits in its frame — see lib/avatarFrame.ts. */
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
  languages: LanguageCode[];
  /** Which games this teammate is listed for. */
  gameSlugs: string[];
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
  avatarFocusX?: number;
  avatarFocusY?: number;
  avatarZoom?: number;
  languages?: string[];
  gameSlugs?: string[];
  gameProfiles?: unknown;
}): TeammateProfileInput {
  const languages = (raw.languages ?? []).filter((v): v is LanguageCode => LANGUAGE_CODES.has(v as LanguageCode));
  // Checked against the registry for the same reason as the languages above:
  // this lands in a Json column, so an unknown slug would sit there forever.
  const gameSlugs = [...new Set((raw.gameSlugs ?? []).filter((slug) => GAME_SLUGS.has(slug)))];
  const gameProfiles = sanitizeGameProfiles(raw.gameProfiles);
  const lol: GameProfileEntry = gameProfiles["league-of-legends"] ?? EMPTY_GAME_PROFILE;

  return {
    tagline: (raw.tagline ?? "").trim().slice(0, 240),
    timezone: (raw.timezone ?? "").trim().slice(0, 60),
    avatarUrl: sanitizeAvatarUrl(raw.avatarUrl),
    avatarFocusX: clampPercent(raw.avatarFocusX ?? DEFAULT_FRAME.focusX),
    avatarFocusY: clampPercent(raw.avatarFocusY ?? DEFAULT_FRAME.focusY),
    avatarZoom: clampPercent(raw.avatarZoom ?? DEFAULT_FRAME.zoom, MIN_ZOOM, MAX_ZOOM),
    languages,
    gameSlugs,
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
