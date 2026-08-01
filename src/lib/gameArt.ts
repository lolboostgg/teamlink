// Real key art in public/games/ for every game in the roster. GameCover.tsx
// just renders whatever this returns, so swapping a game's art is a
// one-line change here.
const EXTENSIONS: Record<string, string> = {
  "teamfight-tactics": "jpg",
};

export function localGameBanner(slug: string): string {
  return `/games/${slug}.${EXTENSIONS[slug] ?? "webp"}`;
}
