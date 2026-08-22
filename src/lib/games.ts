export interface Game {
  slug: string;
  name: string;
  shortName: string;
  tint: string; // scrim color behind the local banner art (see GameCover)
  players: string;
}

// Placeholder catalog — real game data/pricing comes later. Art is the local
// SVG banner at public/games/{slug}.svg (see GameCover.tsx / lib/gameArt.ts).
// Ordered by player count, descending — the order everything (hero
// carousel, /games listing, homepage slider) renders games in.
export const GAMES: Game[] = [
  { slug: "league-of-legends", name: "League of Legends", shortName: "LoL", tint: "#1b2a52", players: "18,200+" },
  { slug: "valorant", name: "Valorant", shortName: "VAL", tint: "#3a1f2b", players: "12,600+" },
  { slug: "fortnite", name: "Fortnite", shortName: "FN", tint: "#1f3a3a", players: "9,400+" },
  { slug: "apex-legends", name: "Apex Legends", shortName: "APEX", tint: "#3a2a1f", players: "6,800+" },
  { slug: "teamfight-tactics", name: "Teamfight Tactics", shortName: "TFT", tint: "#2a1f3a", players: "5,100+" },
  { slug: "marvel-rivals", name: "Marvel Rivals", shortName: "MR", tint: "#3a1f1f", players: "3,900+" },

  // ── Newly listed. No art in public/games/ yet, so GameCover falls back to
  // its lettered tile (see its onError branch) until the banner and icon are
  // dropped in as {slug}.webp and icons/{slug}.png. Only Hangout has its own
  // catalogue so far; the rest sell DEFAULT_CATEGORIES until theirs is written.
  { slug: "counter-strike-2", name: "Counter-Strike 2", shortName: "CS2", tint: "#3a2f1f", players: "—" },
  { slug: "cod-black-ops-7", name: "COD: Black Ops 7", shortName: "BO7", tint: "#2a2a2a", players: "—" },
  { slug: "clash-royale", name: "Clash Royale", shortName: "CR", tint: "#1f2f3a", players: "—" },
  { slug: "minecraft", name: "Minecraft", shortName: "MC", tint: "#1f3a25", players: "—" },
  { slug: "meccha-chameleon", name: "Meccha Chameleon", shortName: "MECH", tint: "#2f1f3a", players: "—" },
  { slug: "world-of-warcraft", name: "World of Warcraft", shortName: "WoW", tint: "#2b1f3f", players: "—" },
  // No game at all — the teammate is what is being booked.
  { slug: "hangout", name: "Hangout", shortName: "HANG", tint: "#3a1f33", players: "—" },

  // Deliberately last: asked for at the back of the hero deck.
  { slug: "overwatch-2", name: "Overwatch 2", shortName: "OW2", tint: "#1f2a3a", players: "4,300+" },
  { slug: "rocket-league", name: "Rocket League", shortName: "RL", tint: "#1f3a2a", players: "2,700+" },
];

export function getGameBySlug(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}
