// Local game art in public/games/. Three games (League of Legends, Valorant,
// TFT) have real lolboost.gg key art (public/games/{slug}.webp); the rest
// use the hand-authored SVG banners. GameCover.tsx just renders whatever
// this returns, so upgrading a game's art is a one-line change here.
const REAL_ART_SLUGS = new Set(["league-of-legends", "valorant", "teamfight-tactics"]);

export function localGameBanner(slug: string): string {
  if (REAL_ART_SLUGS.has(slug)) return `/games/${slug}.webp`;
  return `/games/${slug}.svg`;
}
