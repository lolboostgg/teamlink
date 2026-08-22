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

/**
 * The remaining catalogues.
 *
 * Modelled on the reference screenshots, with one deliberate difference:
 * every figure there is USD and this platform charges EUR throughout (see
 * lib/fx.ts — other currencies are display only). The numerals are carried
 * across unchanged, so €11.99 stands where $11.99 stood. At today's rate
 * that is roughly a tenth more expensive, which is a pricing decision rather
 * than a conversion — worth a deliberate look before this goes near a real
 * customer.
 *
 * `maxTeammates` is not decoration: it caps the group-size stepper, so a Duo
 * mode has to be 1 or the widget will happily sell four of them.
 */
const FORTNITE_CATEGORIES: BookingCategory[] = [
  {
    category: "Bundles",
    options: [
      { name: "Off Spawn", description: "Play with a top 0.1% PR ranked teammate", price: 41.99, originalPrice: 52.99, eta: "3 min away", unit: "/3 hours", maxTeammates: 1 },
      { name: "Rotation", description: "Play with a top 0.1% PR ranked teammate", price: 74.99, originalPrice: 93.99, eta: "3 min away", unit: "/5 hours", maxTeammates: 1 },
      { name: "Victory Lap", description: "Play with a top 0.1% PR ranked teammate", price: 104.99, originalPrice: 131.99, eta: "3 min away", unit: "/8 hours", maxTeammates: 1 },
    ],
  },
  {
    category: "Team Up",
    options: [
      { name: "Duo Ultra", description: "Play with a top 0.1% Unreal teammate with high PR", price: 11.99, eta: "<1 min away", unit: "/45 min", maxTeammates: 1 },
      { name: "Squad Ultra", description: "Play with multiple top 0.1% Unreal teammates with high PR", price: 11.99, eta: "4 min away", unit: "/45 min", maxTeammates: 3 },
      { name: "Duo Scrim", description: "Play scrims with a top 0.1% Unreal teammate", price: 7.99, eta: "4 min away", unit: "/30 min", maxTeammates: 1 },
      { name: "Duo Pro", description: "Play with a pro player with $10K+ earnings", price: 49.99, eta: "3 min away", unit: "/45 min", maxTeammates: 1 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Gamer Girl", description: "Hangout and meet with our best girl teammates", price: 6.49, eta: "3 min away", unit: "/30 min", maxTeammates: 4 },
      { name: "Rizz Party", description: "Play with our best girl teammates to test your rizz", price: 5.99, eta: "4 min away", unit: "/30 min", maxTeammates: 4 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach Duo", description: "Get coached and play 45 min at 50% off", price: 18.99, eta: "3 min away", unit: "/90 min", maxTeammates: 1 },
      { name: "Coach", description: "Get coached by a top 0.1% Unreal & high PR teammate", price: 12.99, eta: "2 min away", unit: "/45 min", maxTeammates: 1 },
    ],
  },
];

const VALORANT_CATEGORIES: BookingCategory[] = [
  {
    category: "Team Up",
    options: [
      { name: "Duo Ultra", description: "Learn & duo with a Radiant teammate", price: 7.99, eta: "<1 min away", unit: "/game", maxTeammates: 1 },
      { name: "2v2 Duo Skirmish", description: "Play 3x Skirmish: Ascension games with a Radiant teammate", price: 6.99, eta: "3 min away", unit: "/game", maxTeammates: 1 },
      { name: "Trio Ultra", description: "Learn & duo with 2x Radiant teammates", price: 14.99, eta: "3 min away", unit: "/game", maxTeammates: 2 },
      { name: "Flex Ultra", description: "Play with multiple Radiant teammates", price: 7.99, eta: "4 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Bundles",
    options: [
      { name: "Pistol Round", description: "Play 3 hours with a Radiant teammate", price: 39.99, originalPrice: 49.99, eta: "2 min away", unit: "/3 hours", maxTeammates: 1 },
      { name: "Clutch Up", description: "Play 5 hours with a Radiant teammate", price: 59.99, originalPrice: 74.99, eta: "2 min away", unit: "/5 hours", maxTeammates: 1 },
      { name: "Overtime", description: "Play 8 hours with a Radiant teammate", price: 79.99, originalPrice: 99.99, eta: "3 min away", unit: "/8 hours", maxTeammates: 1 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Gamer Girl", description: "Hangout and meet with our best girl teammates", price: 6.49, eta: "2 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach Duo", description: "Get coached and play a practice game at 50% off", price: 16.99, eta: "3 min away", unit: "/45 min + game", maxTeammates: 1 },
      { name: "Coaching", description: "Get coached by a Radiant teammate", price: 12.99, eta: "3 min away", unit: "/game", maxTeammates: 1 },
    ],
  },
];

const MARVEL_RIVALS_CATEGORIES: BookingCategory[] = [
  {
    category: "Bundles",
    options: [
      { name: "First Contact", description: "Play 10 games with a top tier teammate", price: 44.99, originalPrice: 56.99, eta: "3 min away", unit: "/game", maxTeammates: 1 },
      { name: "Team Comp", description: "Play 15 games with a top tier teammate", price: 64.99, originalPrice: 81.99, eta: "3 min away", unit: "/game", maxTeammates: 1 },
      { name: "Endgame", description: "Play 25 games with a top tier teammate", price: 109.99, originalPrice: 137.99, eta: "4 min away", unit: "/game", maxTeammates: 1 },
    ],
  },
  {
    category: "Team Up",
    options: [
      { name: "Duo Ultra", description: "Play Marvel Rivals with a top tier teammate", price: 4.99, eta: "2 min away", unit: "/game", maxTeammates: 1 },
      { name: "Squad Ultra", description: "Bring your friends and play with multiple top tier teammates", price: 4.99, eta: "3 min away", unit: "/game", maxTeammates: 5 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Gamer Girl", description: "Hangout and meet with our best girl teammates", price: 6.49, eta: "3 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach Duo", description: "Get coached and play a practice game at 50% off", price: 12.99, eta: "4 min away", unit: "/45 min + game", maxTeammates: 1 },
      { name: "Coach", description: "Get coached by a top tier teammate", price: 9.99, eta: "3 min away", unit: "/45 min", maxTeammates: 1 },
    ],
  },
];

const TFT_CATEGORIES: BookingCategory[] = [
  {
    category: "Bundles",
    options: [
      { name: "First Carousel", description: "Get coached for 3 games with a Master+ teammate", price: 24.99, originalPrice: 31.99, eta: "4 min away", unit: "/3 games", maxTeammates: 1 },
      { name: "Win Streak", description: "Get coached for 5 games with a Master+ teammate", price: 39.99, originalPrice: 49.99, eta: "3 min away", unit: "/5 games", maxTeammates: 1 },
      { name: "Fast 9", description: "Get coached for 10 games with a Master+ teammate", price: 64.99, originalPrice: 81.99, eta: "3 min away", unit: "/10 games", maxTeammates: 1 },
    ],
  },
  {
    category: "Team Up",
    options: [
      { name: "Duo Pilot", description: "Get coached from a Master+ teammate", price: 9.99, eta: "2 min away", unit: "/game", maxTeammates: 1 },
      { name: "Double Up", description: "Play with a Master+ teammate", price: 7.99, eta: "2 min away", unit: "/game", maxTeammates: 1 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Gamer Girl", description: "Play with our most fun gamer girls", price: 6.49, eta: "2 min away", unit: "/game", maxTeammates: 4 },
      { name: "Duo Casual", description: "Play any non-ranked mode with a Master+ teammate", price: 5.99, eta: "4 min away", unit: "/game", maxTeammates: 1 },
    ],
  },
];

const APEX_CATEGORIES: BookingCategory[] = [
  {
    category: "Team Up",
    options: [
      { name: "Duo Ultra", description: "Play with a top 0.1% Apex Predator teammate", price: 11.99, eta: "3 min away", unit: "/45 min", maxTeammates: 1 },
      { name: "Squad Ultra", description: "Play with two top 0.1% Apex Predator teammates", price: 11.99, eta: "3 min away", unit: "/45 min", maxTeammates: 2 },
      { name: "Duo Wildcard", description: "Play Wildcard with a top 0.1% Apex Predator teammate", price: 8.99, eta: "4 min away", unit: "/45 min", maxTeammates: 1 },
      { name: "Squad Wildcard", description: "Play Wildcard with two top 0.1% Apex Predator teammates", price: 8.99, eta: "3 min away", unit: "/45 min", maxTeammates: 2 },
    ],
  },
  {
    category: "Bundles",
    options: [
      { name: "Octane's Stim Rush", description: "Play 3 hours with a top 0.1% Apex Predator", price: 38.99, originalPrice: 48.99, eta: "2 min away", unit: "/3 hours", maxTeammates: 1 },
      { name: "Master's Marathon", description: "Play 5 hours with a top 0.1% Apex Predator", price: 69.99, originalPrice: 87.99, eta: "4 min away", unit: "/5 hours", maxTeammates: 1 },
      { name: "Predator's Path", description: "Play 8 hours with a top 0.1% Apex Predator", price: 99.99, originalPrice: 124.99, eta: "4 min away", unit: "/8 hours", maxTeammates: 1 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach", description: "Get coached by a top 0.1% Apex Predator teammate", price: 12.99, eta: "3 min away", unit: "/45 min", maxTeammates: 1 },
    ],
  },
];

const CS2_CATEGORIES: BookingCategory[] = [
  {
    category: "Bundles",
    options: [
      { name: "Pistol Round", description: "Play for 3 hours with our best teammates", price: 24.99, originalPrice: 31.99, eta: "3 min away", unit: "/3 hours", maxTeammates: 1 },
      { name: "Full Buy", description: "Play for 5 hours with our best teammates", price: 39.99, originalPrice: 49.99, eta: "3 min away", unit: "/5 hours", maxTeammates: 1 },
      { name: "Overtime", description: "Play for 7 hours with our best teammates", price: 49.99, originalPrice: 62.99, eta: "4 min away", unit: "/7 hours", maxTeammates: 1 },
    ],
  },
  {
    category: "Team Up",
    options: [
      { name: "Duo Casual", description: "Play with our best teammates", price: 4.99, eta: "3 min away", unit: "/game", maxTeammates: 4 },
      { name: "Duo Premier", description: "Play with our best teammates", price: 6.99, eta: "2 min away", unit: "/game", maxTeammates: 4 },
      { name: "Duo FACEIT", description: "Play with our best teammates", price: 8.99, eta: "2 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Gamer Girl", description: "Hangout and meet with our best girl teammates", price: 6.49, eta: "4 min away", unit: "/game", maxTeammates: 4 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach", description: "Get coached by our top teammates", price: 14.99, eta: "2 min away", unit: "/game", maxTeammates: 1 },
    ],
  },
];

// The stepper in the reference goes to nine, so these are not duo-only.
const MECCHA_CATEGORIES: BookingCategory[] = [
  {
    category: "Bundles",
    options: [
      { name: "Chromatic Hour", description: "Play 1 hour with our best teammates", price: 9.99, eta: "4 min away", unit: "/1 hour", maxTeammates: 9 },
      { name: "Master Disguise", description: "Play 3 hours with our best teammates", price: 24.99, eta: "3 min away", unit: "/3 hours", maxTeammates: 9 },
      { name: "Full Camouflage", description: "Play 5 hours with our best teammates", price: 39.99, eta: "3 min away", unit: "/5 hours", maxTeammates: 9 },
    ],
  },
  {
    category: "Team Up",
    options: [
      { name: "Duo", description: "Play with our best teammates", price: 4.99, eta: "3 min away", unit: "/30 min", maxTeammates: 9 },
    ],
  },
];

// Trophy Road is deliberately absent. It was the one mode priced by trophy
// bracket in the reference — 0-8k included, then +1 / +2 / +3 up to 15k — and
// nothing in BookingOption can express a surcharge tied to a second choice.
// Listing it at the base price would have undercharged every customer above
// 8k, so it stays out until rank-based pricing actually exists.
const CLASH_ROYALE_CATEGORIES: BookingCategory[] = [
  {
    category: "Team Up",
    options: [
      { name: "Ranked", description: "Play 5 ranked games with an Ultimate Champion teammate climbing on your account to boost your standing", price: 6.99, eta: "3 min away", unit: "/5 games", maxTeammates: 1 },
      { name: "Duo Ultra", description: "Team up for 2v2 matches alongside an Ultimate Champion teammate for maximum synergy and fast wins", price: 4.99, eta: "3 min away", unit: "/5 games", maxTeammates: 1 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coach", description: "Get coached by an Ultimate Champion teammate", price: 6.99, eta: "3 min away", unit: "/30 min", maxTeammates: 1 },
      { name: "Deck Mastery", description: "Work with an Ultimate Champion teammate to fix, refine and build new decks suited to your playstyle", price: 7.99, eta: "4 min away", unit: "/30 min", maxTeammates: 1 },
    ],
  },
  {
    category: "Events",
    options: [
      { name: "Grand Challenge", description: "Have an Ultimate Champion teammate complete a full Grand Challenge on your account for the best rewards", price: 24.99, eta: "4 min away", unit: "/challenge", maxTeammates: 1 },
      { name: "Classic Challenge", description: "Let an Ultimate Champion teammate complete a full Classic Challenge for consistent wins and solid rewards", price: 11.99, eta: "2 min away", unit: "/challenge", maxTeammates: 1 },
      { name: "Mega Challenge", description: "Join an Ultimate Champion teammate for the Mega Challenge event", price: 4.99, eta: "4 min away", unit: "/5 games", maxTeammates: 1 },
    ],
  },
];

const MINECRAFT_CATEGORIES: BookingCategory[] = [
  {
    category: "Bundles",
    options: [
      { name: "Explorer Pack", description: "Play 3 hours of Duo Ultra with a verified pro", price: 32.99, originalPrice: 41.99, eta: "3 min away", unit: "/3 hours", maxTeammates: 1 },
      { name: "Adventurer Pack", description: "Play 5 hours of Duo Ultra with a verified pro", price: 49.99, originalPrice: 62.99, eta: "4 min away", unit: "/5 hours", maxTeammates: 1 },
      { name: "Marathon Pack", description: "Play 7 hours of Duo Ultra with a verified pro", price: 69.99, originalPrice: 87.99, eta: "3 min away", unit: "/7 hours", maxTeammates: 1 },
    ],
  },
  {
    category: "Team Up",
    options: [
      { name: "Duo Survival", description: "Play the classic Minecraft experience with a verified pro", price: 7.99, eta: "2 min away", unit: "/45 min", maxTeammates: 1 },
      { name: "Duo Ultra", description: "Extended session with a verified pro", price: 12.99, eta: "3 min away", unit: "/45 min", maxTeammates: 1 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Gamer Girl", description: "Hangout and meet with our best girl teammates", price: 6.49, eta: "3 min away", unit: "/30 min", maxTeammates: 4 },
    ],
  },
  {
    category: "Coaching",
    options: [
      { name: "Coaching", description: "Get coached by a verified pro", price: 14.99, eta: "3 min away", unit: "/45 min", maxTeammates: 1 },
    ],
  },
];

const COD_CATEGORIES: BookingCategory[] = [
  {
    category: "Ranked",
    options: [
      { name: "Warzone Ranked", description: "Play Warzone Ranked with a top tier teammate", price: 11.99, eta: "3 min away", unit: "/60 min", maxTeammates: 1 },
      { name: "Rebirth Ranked", description: "Play Rebirth Ranked with a top tier teammate", price: 11.99, eta: "4 min away", unit: "/60 min", maxTeammates: 1 },
    ],
  },
  {
    category: "Normal",
    options: [
      { name: "Warzone Duo", description: "Play Warzone Normal with a top tier teammate", price: 9.99, eta: "2 min away", unit: "/60 min", maxTeammates: 1 },
      { name: "Rebirth Duo", description: "Play Rebirth Normal with a top tier teammate", price: 9.99, eta: "4 min away", unit: "/60 min", maxTeammates: 1 },
      { name: "Multiplayer Normal", description: "Play Multiplayer Normal with a top tier teammate", price: 9.99, eta: "2 min away", unit: "/60 min", maxTeammates: 1 },
    ],
  },
];

/** No game at all — the teammate is the product. */
const HANGOUT_CATEGORIES: BookingCategory[] = [
  {
    category: "Hangout",
    options: [
      { name: "Duo Hangout", description: "Hang out with our best teammates", price: 13.99, eta: "3 min away", unit: "/hour", maxTeammates: 4 },
      { name: "Duo Custom", description: "Play any game you want with our best teammates", price: 13.99, eta: "3 min away", unit: "/hour", maxTeammates: 4 },
      { name: "Duo Hangout VIP", description: "Hang out with our most popular teammates", price: 19.99, eta: "3 min away", unit: "/hour", maxTeammates: 4 },
      { name: "Duo Hangout VIP Extended", description: "Hang out with our most popular teammates", price: 54.99, eta: "2 min away", unit: "/3 hours", maxTeammates: 4 },
      { name: "Duo Hangout VIP Marathon", description: "Hang out with our most popular teammates", price: 85.99, eta: "3 min away", unit: "/5 hours", maxTeammates: 4 },
    ],
  },
];

/**
 * World of Warcraft sells runs and hours, not "games".
 *
 * Mythic+ and Delves are priced per run because that is the unit a key is
 * cleared in; arena, blitz and coaching are booked by the hour. "Training"
 * is its own group rather than the roster's usual "Coaching" because PvP
 * coaching and general coaching are different products here.
 */
const WOW_CATEGORIES: BookingCategory[] = [
  {
    category: "Team Up",
    options: [
      { name: "Mythic+ Dungeon single run", description: "Run Mythic+ keys with top-tier teammates", price: 5.99, eta: "4 min away", unit: "/run", maxTeammates: 4 },
      { name: "Mythic+ starter special", description: "Challenge yourself along with an elite teammate!", price: 6.99, eta: "3 min away", unit: "/run", maxTeammates: 1 },
      { name: "Delves", description: "Clear Delves with a top-tier teammate", price: 3.99, eta: "4 min away", unit: "/run", maxTeammates: 1 },
      { name: "Arena", description: "Rated arena sessions with a top-tier teammate", price: 24.99, eta: "4 min away", unit: "/hour", maxTeammates: 2 },
      { name: "Battleground Blitz", description: "Queue Blitz with a top-tier teammate", price: 24.99, eta: "4 min away", unit: "/hour", maxTeammates: 1 },
    ],
  },
  {
    category: "Training",
    options: [
      { name: "Pvp coaching", description: "Get coached by our team teammates", price: 29.99, eta: "3 min away", unit: "/hour", maxTeammates: 1 },
      { name: "Coaching", description: "1-on-1 coaching session with a verified high-rated player", price: 24.99, eta: "2 min away", unit: "/hour", maxTeammates: 1 },
    ],
  },
  {
    category: "Social",
    options: [
      { name: "Gamer Girl", description: "Hangout and meet with our best girl teammates", price: 12.99, eta: "2 min away", unit: "/hour", maxTeammates: 4 },
    ],
  },
];

const CATALOG_BY_GAME: Record<string, BookingCategory[]> = {
  "league-of-legends": LOL_CATEGORIES,
  fortnite: FORTNITE_CATEGORIES,
  hangout: HANGOUT_CATEGORIES,
  "counter-strike-2": CS2_CATEGORIES,
  "meccha-chameleon": MECCHA_CATEGORIES,
  "clash-royale": CLASH_ROYALE_CATEGORIES,
  minecraft: MINECRAFT_CATEGORIES,
  "cod-black-ops-7": COD_CATEGORIES,
  valorant: VALORANT_CATEGORIES,
  "marvel-rivals": MARVEL_RIVALS_CATEGORIES,
  "teamfight-tactics": TFT_CATEGORIES,
  "apex-legends": APEX_CATEGORIES,
  "world-of-warcraft": WOW_CATEGORIES,
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
  Training: "var(--hue-purple)",
  Bundles: "var(--hue-cyan)",
  Hangout: "var(--hue-pink)",
  Events: "var(--hue-green)",
  Normal: "var(--accent)",
};

/** The category a booked mode belongs to, resolved from its name alone. */
export function categoryForOption(gameSlug: string, name: string): string | null {
  for (const cat of getBookingCategories(gameSlug)) {
    if (cat.options.some((o) => o.name === name)) return cat.category;
  }
  return null;
}

/**
 * The cheapest way into a game.
 *
 * "From €4.99" is the number somebody browsing actually wants, and it was
 * only discoverable by opening the game and reading the widget — so the
 * listing asked people to choose between eight games while telling them the
 * price of none.
 */
export function priceFromEUR(gameSlug: string): number | null {
  const prices = getBookingCategories(gameSlug).flatMap((cat) => cat.options.map((o) => o.price));
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** How many modes a game can be booked in — the other half of "is there
 *  anything here for me". */
export function modeCount(gameSlug: string): number {
  return getBookingCategories(gameSlug).reduce((total, cat) => total + cat.options.length, 0);
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
 * Ranked League sessions get harder to staff as the customer's MMR rises.
 * Keep the table in one shared place so the booking UI and the trusted
 * server-side checkout quote can never disagree.
 */
const LOL_RANK_PRICE_MULTIPLIER: Record<string, number> = {
  unranked: 1,
  iron: 1,
  bronze: 1,
  silver: 1.05,
  gold: 1.1,
  platinum: 1.2,
  emerald: 1.3,
  diamond: 1.5,
  master: 1.8,
  grandmaster: 2.1,
  challenger: 2.5,
};

export function isRankPricedOption(gameSlug: string, optionName: string): boolean {
  if (gameSlug !== "league-of-legends") return false;
  const category = categoryForOption(gameSlug, optionName);
  // League calls its competitive teammate modes "Team Up" in the catalogue;
  // other catalogues use the more literal "Ranked" category.
  return category === "Team Up" || category === "Ranked";
}

export function rankPriceMultiplier(gameSlug: string, optionName: string, rank?: string | null): number {
  if (!isRankPricedOption(gameSlug, optionName)) return 1;
  return LOL_RANK_PRICE_MULTIPLIER[rank?.toLowerCase() ?? "unranked"] ?? 1;
}

/**
 * What an order actually costs, decided here rather than taken from the
 * client. The booking widget puts its total in the checkout URL, which
 * anyone can edit — so the server prices the booking again from the same
 * catalogue before charging for it.
 */
export function quoteBookingEUR(
  gameSlug: string,
  optionName: string,
  teammates: number,
  rank?: string | null,
): number | null {
  const option = getBookingOption(gameSlug, optionName);
  if (!option) return null;
  const size = Math.max(1, Math.min(option.maxTeammates, Math.round(teammates)));
  return Math.round(option.price * size * rankPriceMultiplier(gameSlug, optionName, rank) * 100) / 100;
}

export function getBookingOptionDescription(gameSlug: string, name: string): string | undefined {
  return getBookingOption(gameSlug, name)?.description;
}
