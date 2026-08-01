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
// hovered/selected game (see ActiveBackgroundProvider).
export function gameBackground(slug: string): string {
  return `/games/backgrounds/${slug}.${BACKGROUND_EXTENSIONS[slug] ?? "webp"}`;
}
