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

// Landscape key art for the hero carousel cards (tapin.gg style) — only
// exists for a subset of the roster; the rest fall back to the tall poster
// banner (still fine cropped via object-fit: cover at this card size).
const HERO_SECTION_SLUGS = new Set([
  "league-of-legends",
  "valorant",
  "fortnite",
  "teamfight-tactics",
  "marvel-rivals",
  "apex-legends",
]);

export function heroCardBackground(slug: string): string {
  return HERO_SECTION_SLUGS.has(slug) ? `/games/hero-section/${slug}.webp` : localGameBanner(slug);
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

// Dedicated per-game landscape banners for the /games listing page's card
// slider — covers 7 of 8 games; Fortnite falls back to the hero carousel's
// art since no dedicated banner was provided for it.
const GAMES_PAGE_BANNER_SLUGS = new Set([
  "league-of-legends",
  "valorant",
  "teamfight-tactics",
  "marvel-rivals",
  "apex-legends",
  "overwatch-2",
  "rocket-league",
]);

export function gamesPageBanner(slug: string): string {
  return GAMES_PAGE_BANNER_SLUGS.has(slug) ? `/games/hero-section/games/${slug}.avif` : heroCardBackground(slug);
}
