// Hotlinked from lolboost.gg (same owner) per explicit request — placeholder
// art until TeamLink has its own asset pipeline. Not copied into this repo
// since the underlying game art is third-party (Riot, Epic, etc.); linking
// to the sibling site keeps a single source of truth for now.
export const LOLBOOST_BASE = "https://lolboost.gg";
export const LOLBOOST_ASSETS = `${LOLBOOST_BASE}/public/assets/website/images`;

export function lolboostBanner(slug: string, ext: string = "webp") {
  return `${LOLBOOST_ASSETS}/banner/${slug}.${ext}`;
}
