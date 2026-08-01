// Local, code-authored SVG banners in public/games/{slug}.svg — one per
// entry in lib/games.ts. Used as the second fallback tier in GameCover when
// the hotlinked lolboost.gg banner fails to load, so the site has reliable
// local art instead of depending entirely on an external, occasionally
// bot-challenge-blocked host.
export function localGameBanner(slug: string): string {
  return `/games/${slug}.svg`;
}
