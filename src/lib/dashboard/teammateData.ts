export interface UpcomingSession {
  id: string;
  gameSlug: string;
  gameName: string;
  client: string;
  date: string;
  durationMin: number;
}

export interface Review {
  id: string;
  client: string;
  rating: number;
  comment: string;
  date: string;
}

export const TEAMMATE_STATS = {
  totalEarningsEUR: 3_218.6,
  pendingPayoutEUR: 312.4,
  avgRating: 4.9,
  sessionsCompleted: 214,
};

export const UPCOMING_SESSIONS: UpcomingSession[] = [
  { id: "ts-771", gameSlug: "league-of-legends", gameName: "League of Legends", client: "Mara Feld", date: "2026-08-03", durationMin: 45 },
  { id: "ts-770", gameSlug: "valorant", gameName: "Valorant", client: "Owen Brooks", date: "2026-08-04", durationMin: 60 },
  { id: "ts-768", gameSlug: "teamfight-tactics", gameName: "Teamfight Tactics", client: "Yuki Tanaka", date: "2026-08-05", durationMin: 45 },
];

export const RECENT_REVIEWS: Review[] = [
  { id: "rv-501", client: "Mara Feld", rating: 5, comment: "Super patient and genuinely fun to play with!", date: "2026-07-29" },
  { id: "rv-498", client: "Deniz Aksoy", rating: 5, comment: "Carried hard, would book again.", date: "2026-07-27" },
  { id: "rv-492", client: "Sofia Reyes", rating: 4, comment: "Great comms, a bit late to the lobby.", date: "2026-07-24" },
];
