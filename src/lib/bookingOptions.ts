export interface BookingOption {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  eta: string;
  unit: string; // e.g. "/game", "/hour"
}

export interface BookingCategory {
  category: string;
  options: BookingOption[];
}

// Placeholder pricing structure, shaped after a duo/teammate-booking flow
// (category groups -> priced options). Real pricing/catalog comes later.
export const BOOKING_CATEGORIES: BookingCategory[] = [
  {
    category: "Team Up",
    options: [
      { name: "Duo", description: "Play with a Diamond+ teammate", price: 4.99, eta: "1 min away", unit: "/game" },
      { name: "Duo Pro", description: "Play with a Grandmaster+ teammate", price: 7.5, eta: "2 min away", unit: "/game" },
      { name: "Flex", description: "Bring friends and play with multiple teammates", price: 5.49, eta: "1 min away", unit: "/game" },
    ],
  },
  {
    category: "Ranked",
    options: [
      { name: "Ranked 5s", description: "Play ranked with a full premade squad", price: 6.99, eta: "4 min away", unit: "/game" },
      { name: "Duo Normal", description: "Play a normal game with a Master+ teammate", price: 5.99, eta: "1 min away", unit: "/game" },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Hangout", description: "Meet and vibe with our best game buddies", price: 6.49, eta: "1 min away", unit: "/hour" },
      { name: "ARAM", description: "Play for fun with our teammates", price: 4.99, eta: "1 min away", unit: "/game" },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach Duo", description: "Get coached and play a practice game at 100% off", price: 15.99, eta: "3 min away", unit: "/45min" },
      { name: "Coach", description: "Get coached by a Grandmaster+ player", price: 11.99, eta: "2 min away", unit: "/hour" },
    ],
  },
];

export function getBookingOption(name: string): BookingOption | undefined {
  for (const cat of BOOKING_CATEGORIES) {
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
export function quoteBookingEUR(optionName: string, teammates: number): number | null {
  const option = getBookingOption(optionName);
  if (!option) return null;
  const size = Math.max(1, Math.min(5, Math.round(teammates)));
  return Math.round(option.price * size * 100) / 100;
}

export function getBookingOptionDescription(name: string): string | undefined {
  for (const cat of BOOKING_CATEGORIES) {
    const match = cat.options.find((o) => o.name === name);
    if (match) return match.description;
  }
  return undefined;
}
