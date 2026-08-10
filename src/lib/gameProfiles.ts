import { LOL_CHAMPIONS } from "@/lib/data/lolChampions";
import { VALORANT_AGENTS } from "@/lib/data/valorantAgents";

// Per-game profile schema. Every game describes its own rank ladder, role
// set and "pool" (champions / agents / heroes / …) here, so adding or
// re-tuning a game is a change to this one file — nothing in the form, the
// validator or the DB layer knows about League specifically.
export interface ProfileOption {
  value: string;
  label: string;
  /** Image URL for the option mark. */
  icon?: string;
  /** Font Awesome class, used when a game has no art for the option. */
  glyph?: string;
}

export interface GameProfileSection<T = ProfileOption> {
  label: string;
  options: T[];
}

export interface GameProfileConfig {
  slug: string;
  /** Single-choice ladder (rank/tier). Omit for games without ranks. */
  ranks?: GameProfileSection;
  /** Multi-choice roles/lanes. */
  roles?: GameProfileSection;
  /** Multi-choice character pool — large lists get a search box in the UI. */
  pool?: GameProfileSection;
}

// Data Dragon patch used for champion art. Mirrors LOL_VERSION in
// lolboost.gg's app/core/config.php — bump both together.
export const DDRAGON_VERSION = "16.14.1";

export function championIconUrl(key: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${key}.png`;
}

// public/ranks/league-of-legends/{0..10}.png, in ladder order — the same
// numbering lolboost.gg uses for its mini rank icons.
const LOL_RANK_LADDER = [
  "Unranked",
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
];

// public/ranks/valorant/{0..9}.png
const VALORANT_RANK_LADDER = [
  "Unranked",
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
  "Radiant",
];

function numberedRanks(slug: string, ladder: string[]): ProfileOption[] {
  return ladder.map((label, i) => ({
    value: label.toLowerCase(),
    label,
    icon: `/ranks/${slug}/${i}.png`,
  }));
}

function namedRanks(slug: string, entries: [string, string][]): ProfileOption[] {
  return entries.map(([file, label]) => ({
    value: file,
    label,
    icon: `/ranks/${slug}/${file}.webp`,
  }));
}

const LOL_ROLES: ProfileOption[] = [
  { value: "top", label: "Top", icon: "/lol/roles/TopLane.svg" },
  { value: "jungle", label: "Jungle", icon: "/lol/roles/Jungle.svg" },
  { value: "mid", label: "Mid", icon: "/lol/roles/MidLane.svg" },
  { value: "adc", label: "ADC", icon: "/lol/roles/AdCarry.svg" },
  { value: "support", label: "Support", icon: "/lol/roles/Support.svg" },
];

const GAME_PROFILE_LIST: GameProfileConfig[] = [
  {
    slug: "league-of-legends",
    ranks: { label: "Rank", options: numberedRanks("league-of-legends", LOL_RANK_LADDER) },
    roles: { label: "Lanes", options: LOL_ROLES },
    pool: {
      label: "Champion pool",
      options: LOL_CHAMPIONS.map((c) => ({ value: c.key, label: c.label, icon: championIconUrl(c.key) })),
    },
  },
  {
    slug: "valorant",
    ranks: { label: "Rank", options: numberedRanks("valorant", VALORANT_RANK_LADDER) },
    roles: {
      label: "Roles",
      options: [
        { value: "duelist", label: "Duelist", glyph: "fa-solid fa-bolt" },
        { value: "initiator", label: "Initiator", glyph: "fa-solid fa-tower-observation" },
        { value: "controller", label: "Controller", glyph: "fa-solid fa-smog" },
        { value: "sentinel", label: "Sentinel", glyph: "fa-solid fa-shield-halved" },
      ],
    },
    pool: {
      label: "Agent pool",
      options: VALORANT_AGENTS.map((a) => ({ value: a.key, label: a.label, icon: a.icon })),
    },
  },
  {
    // TFT shares the League ladder and has no character pool worth listing.
    slug: "teamfight-tactics",
    ranks: { label: "Rank", options: numberedRanks("league-of-legends", LOL_RANK_LADDER) },
  },
  {
    slug: "apex-legends",
    ranks: {
      label: "Rank",
      options: namedRanks("apex-legends", [
        ["rookie", "Rookie"],
        ["bronze", "Bronze"],
        ["silver", "Silver"],
        ["gold", "Gold"],
        ["platinum", "Platinum"],
        ["diamond", "Diamond"],
        ["master", "Master"],
      ]),
    },
    roles: {
      label: "Roles",
      options: [
        { value: "assault", label: "Assault", glyph: "fa-solid fa-crosshairs" },
        { value: "skirmisher", label: "Skirmisher", glyph: "fa-solid fa-person-running" },
        { value: "recon", label: "Recon", glyph: "fa-solid fa-binoculars" },
        { value: "controller", label: "Controller", glyph: "fa-solid fa-tower-broadcast" },
        { value: "support", label: "Support", glyph: "fa-solid fa-kit-medical" },
      ],
    },
  },
  {
    slug: "overwatch-2",
    ranks: {
      label: "Rank",
      options: namedRanks("overwatch-2", [
        ["bronze", "Bronze"],
        ["silver", "Silver"],
        ["gold", "Gold"],
        ["platinum", "Platinum"],
        ["diamond", "Diamond"],
        ["master", "Master"],
        ["grandmaster", "Grandmaster"],
        ["champion", "Champion"],
        ["top500", "Top 500"],
      ]),
    },
    roles: {
      label: "Roles",
      options: [
        { value: "tank", label: "Tank", glyph: "fa-solid fa-shield" },
        { value: "damage", label: "Damage", glyph: "fa-solid fa-crosshairs" },
        { value: "support", label: "Support", glyph: "fa-solid fa-kit-medical" },
      ],
    },
  },
  {
    slug: "marvel-rivals",
    ranks: {
      label: "Rank",
      options: namedRanks("marvel-rivals", [
        ["bronze", "Bronze"],
        ["silver", "Silver"],
        ["gold", "Gold"],
        ["platinum", "Platinum"],
        ["diamond", "Diamond"],
        ["grand-master", "Grandmaster"],
        ["celestial", "Celestial"],
        ["eternity", "Eternity"],
      ]),
    },
    roles: {
      label: "Roles",
      options: [
        { value: "vanguard", label: "Vanguard", glyph: "fa-solid fa-shield" },
        { value: "duelist", label: "Duelist", glyph: "fa-solid fa-bolt" },
        { value: "strategist", label: "Strategist", glyph: "fa-solid fa-kit-medical" },
      ],
    },
  },
  {
    slug: "rocket-league",
    ranks: {
      label: "Rank",
      options: namedRanks("rocket-league", [
        ["unranked", "Unranked"],
        ["bronze", "Bronze"],
        ["silver", "Silver"],
        ["gold", "Gold"],
        ["platinum", "Platinum"],
        ["diamond", "Diamond"],
        ["champion", "Champion"],
        ["grand-champion", "Grand Champion"],
        ["supersonic-legend", "Supersonic Legend"],
      ]),
    },
    roles: {
      label: "Playstyle",
      options: [
        { value: "striker", label: "Striker", glyph: "fa-solid fa-futbol" },
        { value: "midfielder", label: "Midfielder", glyph: "fa-solid fa-arrows-left-right" },
        { value: "defender", label: "Defender", glyph: "fa-solid fa-shield-halved" },
      ],
    },
  },
  {
    // No rank art shipped for Fortnite — roles only until we have icons.
    slug: "fortnite",
    roles: {
      label: "Modes",
      options: [
        { value: "zero-build", label: "Zero Build", glyph: "fa-solid fa-person-rifle" },
        { value: "builds", label: "Builds", glyph: "fa-solid fa-hammer" },
        { value: "arena", label: "Arena", glyph: "fa-solid fa-trophy" },
      ],
    },
  },

  // ── The newly listed games ────────────────────────────────────────────
  //
  // Roles only, no rank ladders. A config is what makes a game appear as a
  // tab in the teammate profile (see TeammateProfileForm), and the tab is
  // what lets a teammate be listed for it at all — so without an entry here
  // nobody could take a Minecraft or a Hangout order, whatever the catalogue
  // said.
  //
  // The ranks are left out rather than invented: Minecraft and Hangout have
  // no ladder to speak of, and for the rest a made-up tier list would show up
  // at checkout as a real question with wrong answers. The rank row hides
  // itself when a game has none (see CheckoutIngameStep), so this is a
  // complete state, not a half-finished one. Add ladders per game as they
  // are decided.
  {
    slug: "counter-strike-2",
    roles: {
      label: "Roles",
      options: [
        { value: "entry", label: "Entry", glyph: "fa-solid fa-bolt" },
        { value: "awper", label: "AWPer", glyph: "fa-solid fa-crosshairs" },
        { value: "support", label: "Support", glyph: "fa-solid fa-kit-medical" },
        { value: "igl", label: "IGL", glyph: "fa-solid fa-chess-king" },
        { value: "lurker", label: "Lurker", glyph: "fa-solid fa-user-secret" },
      ],
    },
  },
  {
    slug: "cod-black-ops-7",
    roles: {
      label: "Modes",
      options: [
        { value: "warzone", label: "Warzone", glyph: "fa-solid fa-parachute-box" },
        { value: "rebirth", label: "Rebirth", glyph: "fa-solid fa-umbrella-beach" },
        { value: "multiplayer", label: "Multiplayer", glyph: "fa-solid fa-crosshairs" },
        { value: "ranked", label: "Ranked", glyph: "fa-solid fa-trophy" },
      ],
    },
  },
  {
    slug: "clash-royale",
    roles: {
      label: "Specialities",
      options: [
        { value: "ladder", label: "Ladder push", glyph: "fa-solid fa-arrow-trend-up" },
        { value: "challenges", label: "Challenges", glyph: "fa-solid fa-flag" },
        { value: "deck-building", label: "Deck building", glyph: "fa-solid fa-layer-group" },
        { value: "2v2", label: "2v2", glyph: "fa-solid fa-user-group" },
      ],
    },
  },
  {
    slug: "minecraft",
    roles: {
      label: "Specialities",
      options: [
        { value: "survival", label: "Survival", glyph: "fa-solid fa-tree" },
        { value: "building", label: "Building", glyph: "fa-solid fa-cubes" },
        { value: "redstone", label: "Redstone", glyph: "fa-solid fa-bolt" },
        { value: "pvp", label: "PvP", glyph: "fa-solid fa-khanda" },
        { value: "minigames", label: "Minigames", glyph: "fa-solid fa-dice" },
      ],
    },
  },
  {
    slug: "meccha-chameleon",
    roles: {
      label: "Specialities",
      options: [
        { value: "casual", label: "Casual", glyph: "fa-solid fa-face-smile" },
        { value: "competitive", label: "Competitive", glyph: "fa-solid fa-trophy" },
        { value: "coaching", label: "Coaching", glyph: "fa-solid fa-graduation-cap" },
      ],
    },
  },
  {
    // No game behind it, so the "roles" are what the person is good at being.
    slug: "hangout",
    roles: {
      label: "Good at",
      options: [
        { value: "chatting", label: "Chatting", glyph: "fa-solid fa-comments" },
        { value: "listening", label: "Listening", glyph: "fa-solid fa-ear-listen" },
        { value: "gaming", label: "Any game", glyph: "fa-solid fa-gamepad" },
        { value: "watching", label: "Watch together", glyph: "fa-solid fa-tv" },
        { value: "music", label: "Music", glyph: "fa-solid fa-headphones" },
      ],
    },
  },
];

export const GAME_PROFILES: Record<string, GameProfileConfig> = Object.fromEntries(
  GAME_PROFILE_LIST.map((c) => [c.slug, c]),
);

export function getGameProfileConfig(slug: string): GameProfileConfig | undefined {
  return GAME_PROFILES[slug];
}

// ---------------------------------------------------------------------------
// Stored shape: one entry per game the teammate is listed for.
// ---------------------------------------------------------------------------
export interface GameProfileEntry {
  rank: string | null;
  roles: string[];
  pool: string[];
}

export type GameProfileMap = Record<string, GameProfileEntry>;

export const EMPTY_GAME_PROFILE: GameProfileEntry = { rank: null, roles: [], pool: [] };

/**
 * Drops anything the config doesn't know about — games, ranks, roles and pool
 * members are all validated against the registry, so a tampered request can't
 * write arbitrary strings into the Json column.
 */
export function sanitizeGameProfiles(raw: unknown): GameProfileMap {
  if (!raw || typeof raw !== "object") return {};
  const out: GameProfileMap = {};

  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    const config = GAME_PROFILES[slug];
    if (!config || !value || typeof value !== "object") continue;
    const entry = value as Partial<GameProfileEntry>;

    const allowed = (section: GameProfileSection | undefined, values: unknown) => {
      if (!section || !Array.isArray(values)) return [];
      const set = new Set(section.options.map((o) => o.value));
      return [...new Set(values.filter((v): v is string => typeof v === "string" && set.has(v)))];
    };

    const rank =
      typeof entry.rank === "string" && config.ranks?.options.some((o) => o.value === entry.rank)
        ? entry.rank
        : null;

    out[slug] = { rank, roles: allowed(config.roles, entry.roles), pool: allowed(config.pool, entry.pool) };
  }

  return out;
}

export function getOptionMeta(section: GameProfileSection | undefined, value: string): ProfileOption | undefined {
  return section?.options.find((o) => o.value === value);
}
