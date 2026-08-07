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
  "league-of-legends": "avif",
  "marvel-rivals": "avif",
  "rocket-league": "avif",
};

// Wide ambient art for the full-page backdrop that shifts with the
// hovered/selected game (see AmbientGameBackground). Doubles as the
// <video> poster for games that have a background clip instead.
export function gameBackground(slug: string): string {
  return `/games/backgrounds/${slug}.${BACKGROUND_EXTENSIONS[slug] ?? "webp"}`;
}

const BACKGROUND_VIDEO_EXTENSIONS: Record<string, string> = {
  "league-of-legends": "webm",
  "teamfight-tactics": "webm",
  "marvel-rivals": "mp4",
  valorant: "mp4",
};

// A handful of games get a looping ambient clip instead of a still — same
// blitz.gg-style hero treatment, muted/no controls (see AmbientGameBackground).
// Null means "no clip for this game", not "no background" — gameBackground()
// still covers every game.
export function gameBackgroundVideo(slug: string): string | null {
  const ext = BACKGROUND_VIDEO_EXTENSIONS[slug];
  return ext ? `/games/backgrounds/${slug}.${ext}` : null;
}

// Art for every "choose game" card (hero carousel, /games grid, teammate
// card banners) — always the tall poster banner. A landscape hero-section
// variant used to cover part of the roster, but its aspect ratio didn't
// match this card shape and cropped badly; the banner set is a uniform
// ~3:4 portrait across the whole roster, so it's used everywhere now.
export function heroCardBackground(slug: string): string {
  return localGameBanner(slug);
}
