// Real key art in public/games/ for every game in the roster. GameCover.tsx
// just renders whatever this returns, so swapping a game's art is a
// one-line change here.
const EXTENSIONS: Record<string, string> = {
  "teamfight-tactics": "jpg",
};

export function localGameBanner(slug: string): string {
  return `/games/${slug}.${EXTENSIONS[slug] ?? "webp"}`;
}

// Square logo mark for the same game, used wherever a compact badge/icon
// reads better than the full poster-style banner (small tags, headers).
export function gameIcon(slug: string): string {
  return `/games/icons/${slug}.png`;
}

const BACKGROUND_EXTENSIONS: Record<string, string> = {
  "apex-legends": "avif",
  "league-of-legends": "avif",
  "marvel-rivals": "avif",
  "rocket-league": "avif",
};

// Wide ambient art for the full-page backdrop that shifts with the
// hovered/selected game (see AmbientGameBackground).
export function gameBackground(slug: string): string {
  return `/games/backgrounds/${slug}.${BACKGROUND_EXTENSIONS[slug] ?? "webp"}`;
}

// Art for every "choose game" card (hero carousel, /games grid, teammate
// card banners) — always the tall poster banner. A landscape hero-section
// variant used to cover part of the roster, but its aspect ratio didn't
// match this card shape and cropped badly; the banner set is a uniform
// ~3:4 portrait across the whole roster, so it's used everywhere now.
export function heroCardBackground(slug: string): string {
  return localGameBanner(slug);
}

// Stylized wordmark image overlaid on the card instead of plain text —
// only available for a few games; callers should fall back to the game
// name as text when this returns null.
const HERO_SECTION_WORDMARK_SLUGS = new Set([
  "league-of-legends",
  "valorant",
  "fortnite",
  "teamfight-tactics",
  "marvel-rivals",
]);

export function heroCardWordmark(slug: string): string | null {
  return HERO_SECTION_WORDMARK_SLUGS.has(slug) ? `/games/hero-section/fonts/${slug}.webp` : null;
}
