import type { LanguageCode } from "@/lib/i18n";
import type { LolRankTier, ChampionName } from "@/lib/lolAssets";

export interface Teammate {
  id: string;
  name: string;
  avatarInitials: string;
  tagline: string;
  languages: LanguageCode[];
  timezone: string;
  rating: number;
  sessions: number;
  gameSlugs: string[];
  lolRank?: LolRankTier;
  lolChampions?: ChampionName[];
}

// Mock roster — no backend, so this is what "specific teammate" selection
// draws from. Several are tagged for League of Legends with a rank +
// champion pool (the real lolboost icon assets); others are generic across
// their games.
export const TEAMMATES: Teammate[] = [
  {
    id: "tm-nova",
    name: "Nova",
    avatarInitials: "NV",
    tagline: "Chill Diamond+ duo, great with new players.",
    languages: ["en", "de"],
    timezone: "CET (UTC+1)",
    rating: 4.9,
    sessions: 214,
    gameSlugs: ["league-of-legends"],
    lolRank: "diamond",
    lolChampions: ["Ahri", "Lux", "Ezreal"],
  },
  {
    id: "tm-halcyon",
    name: "Halcyon",
    avatarInitials: "HC",
    tagline: "Ex-competitive jungler, patient shotcaller.",
    languages: ["en"],
    timezone: "GMT (UTC+0)",
    rating: 5.0,
    sessions: 98,
    gameSlugs: ["league-of-legends", "teamfight-tactics"],
    lolRank: "master",
    lolChampions: ["Garen", "Ashe"],
  },
  {
    id: "tm-lumen",
    name: "Lumen",
    avatarInitials: "LM",
    tagline: "Challenger support main, loves teaching.",
    languages: ["en", "fr"],
    timezone: "CET (UTC+1)",
    rating: 4.8,
    sessions: 356,
    gameSlugs: ["league-of-legends"],
    lolRank: "challenger",
    lolChampions: ["Lux", "Katarina", "Vayne"],
  },
  {
    id: "tm-kestrel",
    name: "Kestrel",
    avatarInitials: "KS",
    tagline: "Radiant duelist, aggressive entry style.",
    languages: ["en", "pl"],
    timezone: "CET (UTC+1)",
    rating: 5.0,
    sessions: 142,
    gameSlugs: ["valorant"],
  },
  {
    id: "tm-vantage",
    name: "Vantage",
    avatarInitials: "VT",
    tagline: "Apex Predator, calm comms even in clutch.",
    languages: ["en"],
    timezone: "EST (UTC-5)",
    rating: 4.8,
    sessions: 87,
    gameSlugs: ["apex-legends"],
  },
  {
    id: "tm-ultearxx",
    name: "UltearXX",
    avatarInitials: "UX",
    tagline: "TFT Challenger, econ-focused playstyle.",
    languages: ["en", "tr"],
    timezone: "TRT (UTC+3)",
    rating: 4.9,
    sessions: 63,
    gameSlugs: ["teamfight-tactics"],
    lolRank: "challenger",
  },
  {
    id: "tm-driftwood",
    name: "Driftwood",
    avatarInitials: "DW",
    tagline: "Fortnite Champion League regular, chill vibes.",
    languages: ["en", "es"],
    timezone: "CET (UTC+1)",
    rating: 4.7,
    sessions: 121,
    gameSlugs: ["fortnite"],
  },
  {
    id: "tm-echo",
    name: "Echo",
    avatarInitials: "EC",
    tagline: "OW2 GM support, great voice comms.",
    languages: ["en", "pl"],
    timezone: "CET (UTC+1)",
    rating: 4.9,
    sessions: 176,
    gameSlugs: ["overwatch-2"],
  },
  {
    id: "tm-corvid",
    name: "Corvid",
    avatarInitials: "CV",
    tagline: "Marvel Rivals top 500, flex duelist.",
    languages: ["en"],
    timezone: "GMT (UTC+0)",
    rating: 4.6,
    sessions: 34,
    gameSlugs: ["marvel-rivals"],
  },
  {
    id: "tm-sable",
    name: "Sable",
    avatarInitials: "SB",
    tagline: "Grand Champion RL, aerial mechanics coach.",
    languages: ["en", "de"],
    timezone: "CET (UTC+1)",
    rating: 4.9,
    sessions: 209,
    gameSlugs: ["rocket-league"],
  },
];

export function getTeammatesForGame(slug: string): Teammate[] {
  return TEAMMATES.filter((t) => t.gameSlugs.includes(slug));
}

export function getTeammateById(id: string): Teammate | undefined {
  return TEAMMATES.find((t) => t.id === id);
}
