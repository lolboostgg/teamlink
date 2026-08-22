// Real key art in public/games/ for every game in the roster. GameCover.tsx
// just renders whatever this returns, so swapping a game's art is a
// one-line change here.
const EXTENSIONS: Record<string, string> = {
  "teamfight-tactics": "jpg",
};

// Same escape hatch as BACKGROUND_FILE_OVERRIDES below: a banner whose plain
// `/games/{slug}.webp` URL is unusable gets served under a different name.
// Hangout's was requested before its art was deployed, so Cloudflare cached
// the /games/[slug] route's 404 for that URL with a one-year s-maxage — the
// file is live, the URL is not. A new filename is a new cache key.
const BANNER_FILE_OVERRIDES: Record<string, string> = {
  hangout: "hangout-key-art.webp",
};

export function localGameBanner(slug: string): string {
  return `/games/${BANNER_FILE_OVERRIDES[slug] ?? `${slug}.${EXTENSIONS[slug] ?? "webp"}`}`;
}

// The roster's icons are PNG; World of Warcraft's mark arrived as AVIF and is
// served as it is rather than re-encoded — every browser that reaches this
// site decodes AVIF, and a lossy round-trip through PNG would only make the
// file bigger.
const ICON_EXTENSIONS: Record<string, string> = {
  "world-of-warcraft": "avif",
};

// Square logo mark for the same game, used wherever a compact badge/icon
// reads better than the full poster-style banner (small tags, headers).
export function gameIcon(slug: string): string {
  return `/games/icons/${slug}.${ICON_EXTENSIONS[slug] ?? "png"}`;
}

const BACKGROUND_EXTENSIONS: Record<string, string> = {
  "league-of-legends": "avif",
  "marvel-rivals": "avif",
  "rocket-league": "avif",
  "world-of-warcraft": "avif",
};

// Games whose background file isn't just `${slug}.${ext}` — used once here
// for Fortnite so the replaced art gets a genuinely new URL instead of
// reusing fortnite.webp's old one, which browsers/CDNs had already cached.
const BACKGROUND_FILE_OVERRIDES: Record<string, string> = {
  fortnite: "fortnite-key-art.webp",
};

// Wide ambient art for the full-page backdrop that shifts with the
// hovered/selected game (see AmbientGameBackground). Doubles as the
// <video> poster for games that have a background clip instead.
export function gameBackground(slug: string): string {
  return `/games/backgrounds/${BACKGROUND_FILE_OVERRIDES[slug] ?? `${slug}.${BACKGROUND_EXTENSIONS[slug] ?? "webp"}`}`;
}

/**
 * Games with a looping ambient clip.
 *
 * One format and one naming convention now, where there used to be four
 * files across two containers. They are VP9/WebM, 720p, audio stripped (the
 * player is muted, so every audio byte was waste), and encoded for what they
 * actually are: a backdrop at 30% brightness behind text. Marvel Rivals was
 * 1080p H.264 at 6.3 Mbit/s — 46.7 MB for one hover.
 *
 * The `-loop` suffix is not decoration. The old names are in Cloudflare's
 * cache with a four-hour TTL, and a new name is the only way the saving
 * reaches anybody today rather than this evening.
 */
const BACKGROUND_VIDEOS = new Set(["league-of-legends", "teamfight-tactics", "marvel-rivals", "valorant"]);

// Null means "no clip for this game", not "no background" — gameBackground()
// still covers every game.
export function gameBackgroundVideo(slug: string): string | null {
  return BACKGROUND_VIDEOS.has(slug) ? `/games/backgrounds/${slug}-loop.webm` : null;
}

// Art for every "choose game" card (hero carousel, /games grid, teammate
// card banners) — always the tall poster banner. A landscape hero-section
// variant used to cover part of the roster, but its aspect ratio didn't
// match this card shape and cropped badly; the banner set is a uniform
// ~3:4 portrait across the whole roster, so it's used everywhere now.
export function heroCardBackground(slug: string): string {
  return localGameBanner(slug);
}
