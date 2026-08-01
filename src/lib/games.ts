export interface Game {
  slug: string;
  name: string;
  shortName: string;
  tint: string; // flat accent tint used for the placeholder cover, no gradients
  players: string;
}

// Placeholder catalog — real game art/data comes later. Tints are flat
// single colors standing in for cover art.
export const GAMES: Game[] = [
  { slug: "league-of-legends", name: "League of Legends", shortName: "LoL", tint: "#1b2a52", players: "18,200+" },
  { slug: "valorant", name: "Valorant", shortName: "VAL", tint: "#3a1f2b", players: "12,600+" },
  { slug: "fortnite", name: "Fortnite", shortName: "FN", tint: "#1f3a3a", players: "9,400+" },
  { slug: "teamfight-tactics", name: "Teamfight Tactics", shortName: "TFT", tint: "#2a1f3a", players: "5,100+" },
  { slug: "apex-legends", name: "Apex Legends", shortName: "APEX", tint: "#3a2a1f", players: "6,800+" },
  { slug: "overwatch-2", name: "Overwatch 2", shortName: "OW2", tint: "#1f2a3a", players: "4,300+" },
  { slug: "marvel-rivals", name: "Marvel Rivals", shortName: "MR", tint: "#3a1f1f", players: "3,900+" },
  { slug: "rocket-league", name: "Rocket League", shortName: "RL", tint: "#1f3a2a", players: "2,700+" },
];

export function getGameBySlug(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}
