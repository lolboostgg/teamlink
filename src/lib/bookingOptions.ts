export interface BookingOption {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  eta: string;
  unit: string; // e.g. "/game", "/hour"
  /** How many teammates this mode can be booked with. A 1-on-1 mode
   * (Duo, Coach) has nothing to pick, so the group-size stepper hides
   * entirely instead of offering a choice of exactly one. */
  maxTeammates: number;
}

export interface BookingCategory {
  category: string;
  options: BookingOption[];
}

// League of Legends' real mode lineup — every other game still falls back
// to DEFAULT_CATEGORIES below until its own catalogue is written.
const LOL_CATEGORIES: BookingCategory[] = [
  {
    category: "Team Up",
    options: [
      { name: "Duo", description: "Play with a Master+ teammate", price: 4.99, eta: "1 min away", unit: "/game", maxTeammates: 1 },
      { name: "Duo Ultra", description: "Play with a Grandmaster+ teammate", price: 7.5, eta: "<1 min away", unit: "/game", maxTeammates: 1 },
      { name: "Flex", description: "Bring your friends and play with multiple Master+ teammates", price: 5.49, eta: "<1 min away", unit: "/game", maxTeammates: 4 },
      { name: "DuoX", description: "Play with a Diamond 4+ teammate", price: 4.99, eta: "3 min away", unit: "/game", maxTeammates: 1 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Duo Normal", description: "Play a normal game with a Master+ teammate", price: 5.99, eta: "2 min away", unit: "/game", maxTeammates: 4 },
      { name: "Duo Classic", description: "Play League Classic with a Master+ teammate", price: 5.99, eta: "1 min away", unit: "/game", maxTeammates: 4 },
      { name: "Gamer Girl", description: "Hangout and meet with our best girl teammates", price: 6.49, eta: "1 min away", unit: "/game", maxTeammates: 4 },
      { name: "ARAM", description: "Play a for fun ARAM with our best teammates", price: 4.99, eta: "1 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach Duo", description: "Get coached and play a practice game at 50% off", price: 15.99, eta: "1 min away", unit: "/45 min + game", maxTeammates: 1 },
      { name: "Coach", description: "Get coached by a Grandmaster+ teammate", price: 11.99, eta: "<1 min away", unit: "/45 min", maxTeammates: 1 },
    ],
  },
];

// Placeholder pricing structure, shaped after a duo/teammate-booking flow
// (category groups -> priced options) — used for every game that doesn't
// have its own catalogue yet (see LOL_CATEGORIES).
const DEFAULT_CATEGORIES: BookingCategory[] = [
  {
    category: "Team Up",
    options: [
      { name: "Duo", description: "Play with a Diamond+ teammate", price: 4.99, eta: "1 min away", unit: "/game", maxTeammates: 1 },
      { name: "Duo Pro", description: "Play with a Grandmaster+ teammate", price: 7.5, eta: "2 min away", unit: "/game", maxTeammates: 1 },
      { name: "Flex", description: "Bring friends and play with multiple teammates", price: 5.49, eta: "1 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Ranked",
    options: [
      { name: "Ranked 5s", description: "Play ranked with a full premade squad", price: 6.99, eta: "4 min away", unit: "/game", maxTeammates: 4 },
      { name: "Duo Normal", description: "Play a normal game with a Master+ teammate", price: 5.99, eta: "1 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Hangout", description: "Meet and vibe with our best game buddies", price: 6.49, eta: "1 min away", unit: "/hour", maxTeammates: 4 },
      { name: "ARAM", description: "Play for fun with our teammates", price: 4.99, eta: "1 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach Duo", description: "Get coached and play a practice game at 100% off", price: 15.99, eta: "3 min away", unit: "/45min", maxTeammates: 1 },
      { name: "Coach", description: "Get coached by a Grandmaster+ player", price: 11.99, eta: "2 min away", unit: "/hour", maxTeammates: 1 },
    ],
  },
];

const CATALOG_BY_GAME: Record<string, BookingCategory[]> = {
  "league-of-legends": LOL_CATEGORIES,
};

export function getBookingCategories(gameSlug: string): BookingCategory[] {
  return CATALOG_BY_GAME[gameSlug] ?? DEFAULT_CATEGORIES;
}

/**
 * Each category's accent, from the curated hue set (see globals.css :root).
 *
 * Lifted out of BookingWidget, which owned the only copy — so a mode was
 * pink while a customer was choosing it and plain grey everywhere after. The
 * colour is part of how a mode is recognised; it should survive the booking.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  "Team Up": "var(--accent)",
  Ranked: "var(--hue-gold)",
  Social: "var(--hue-pink)",
  Coaching: "var(--hue-purple)",
};

/** The category a booked mode belongs to, resolved from its name alone. */
export function categoryForOption(gameSlug: string, name: string): string | null {
  for (const cat of getBookingCategories(gameSlug)) {
    if (cat.options.some((o) => o.name === name)) return cat.category;
  }
  return null;
}

/** The accent for a booked mode, for anywhere that shows one after checkout. */
export function optionColor(gameSlug: string, name: string): string | null {
  const category = categoryForOption(gameSlug, name);
  return category ? CATEGORY_COLORS[category] ?? null : null;
}

export function getBookingOption(gameSlug: string, name: string): BookingOption | undefined {
  for (const cat of getBookingCategories(gameSlug)) {
    const match = cat.options.find((o) => o.name === name);
    if (match) return match;
  }
  return undefined;
}

/**
 * What an order actually costs, decided here rather than taken from the
 * client. The booking widget puts its total in the checkout URL, which
 * anyone can edit — so the server prices the booking again from the same
 * catalogue before charging for it.
 */
export function quoteBookingEUR(gameSlug: string, optionName: string, teammates: number): number | null {
  const option = getBookingOption(gameSlug, optionName);
  if (!option) return null;
  const size = Math.max(1, Math.min(option.maxTeammates, Math.round(teammates)));
  return Math.round(option.price * size * 100) / 100;
}

export function getBookingOptionDescription(gameSlug: string, name: string): string | undefined {
  return getBookingOption(gameSlug, name)?.description;
}
