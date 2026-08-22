/**
 * Server/region options per game, for the in-game account a customer books
 * with. A teammate on the wrong region simply cannot add them, so this is
 * asked before payment rather than sorted out in chat afterwards.
 */
export interface RegionOption {
  value: string;
  label: string;
}

const RIOT: RegionOption[] = [
  { value: "EUW", label: "EU West" },
  { value: "EUNE", label: "EU Nordic & East" },
  { value: "NA", label: "North America" },
  { value: "OCE", label: "Oceania" },
  { value: "BR", label: "Brazil" },
  { value: "LAN", label: "Latin America North" },
  { value: "LAS", label: "Latin America South" },
  { value: "TR", label: "Turkey" },
  { value: "RU", label: "Russia" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "Korea" },
];

const VALORANT: RegionOption[] = [
  { value: "EU", label: "Europe" },
  { value: "NA", label: "North America" },
  { value: "AP", label: "Asia Pacific" },
  { value: "KR", label: "Korea" },
  { value: "BR", label: "Brazil" },
  { value: "LATAM", label: "Latin America" },
];

const GLOBAL: RegionOption[] = [
  { value: "EU", label: "Europe" },
  { value: "NA", label: "North America" },
  { value: "SA", label: "South America" },
  { value: "ASIA", label: "Asia" },
  { value: "OCE", label: "Oceania" },
  { value: "ME", label: "Middle East" },
];

const BY_GAME: Record<string, RegionOption[]> = {
  "league-of-legends": RIOT,
  "teamfight-tactics": RIOT,
  valorant: VALORANT,
};

export function regionsForGame(gameSlug: string): RegionOption[] {
  return BY_GAME[gameSlug] ?? GLOBAL;
}

/** What the IGN field should look like, so people paste the right thing. */
export function ignPlaceholder(gameSlug: string): string {
  if (gameSlug === "league-of-legends" || gameSlug === "teamfight-tactics" || gameSlug === "valorant") {
    return "Name#TAG";
  }
  // A WoW character is added by BattleTag, which is a name and a number.
  if (gameSlug === "world-of-warcraft") return "Name#1234";
  return "Your in-game name";
}

export function ignHint(gameSlug: string): string {
  if (gameSlug === "league-of-legends" || gameSlug === "teamfight-tactics" || gameSlug === "valorant") {
    return "Riot ID including the tag — your teammate can't find you without it.";
  }
  if (gameSlug === "world-of-warcraft") {
    return "Your BattleTag including the number — your teammate can't add you without it.";
  }
  return "Exactly as it appears in game, so your teammate can add you.";
}
