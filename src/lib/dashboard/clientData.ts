export interface ClientBooking {
  id: string;
  gameSlug: string;
  gameName: string;
  option: string;
  teammates: number;
  priceEUR: number;
  date: string;
  status: "upcoming" | "completed" | "cancelled";
}

export interface FavoriteTeammate {
  id: string;
  name: string;
  gameName: string;
  rating: number;
  sessions: number;
}

// Mock data — no backend yet, matches the rest of the project's
// mock-data-first approach. All prices are EUR (the app's canonical base
// unit — see lib/currency.ts).
export const CLIENT_STATS = {
  totalSpendEUR: 284.4,
  upcomingCount: 2,
  completedCount: 17,
  favoriteGame: "League of Legends",
};

export const CLIENT_BOOKINGS: ClientBooking[] = [
  { id: "bk-1042", gameSlug: "league-of-legends", gameName: "League of Legends", option: "Duo Pro", teammates: 1, priceEUR: 7.5, date: "2026-08-03", status: "upcoming" },
  { id: "bk-1039", gameSlug: "valorant", gameName: "Valorant", option: "Ranked 5s", teammates: 4, priceEUR: 27.96, date: "2026-08-05", status: "upcoming" },
  { id: "bk-1031", gameSlug: "apex-legends", gameName: "Apex Legends", option: "Duo", teammates: 1, priceEUR: 4.99, date: "2026-07-27", status: "completed" },
  { id: "bk-1028", gameSlug: "fortnite", gameName: "Fortnite", option: "Hangout", teammates: 2, priceEUR: 12.98, date: "2026-07-24", status: "completed" },
  { id: "bk-1019", gameSlug: "overwatch-2", gameName: "Overwatch 2", option: "Coach", teammates: 1, priceEUR: 11.99, date: "2026-07-18", status: "cancelled" },
];

export const CLIENT_FAVORITES: FavoriteTeammate[] = [
  { id: "tm-201", name: "Nova", gameName: "League of Legends", rating: 4.9, sessions: 14 },
  { id: "tm-114", name: "Kestrel", gameName: "Valorant", rating: 5.0, sessions: 9 },
  { id: "tm-087", name: "Vantage", gameName: "Apex Legends", rating: 4.8, sessions: 6 },
];
