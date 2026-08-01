"use client";

import { gameBackground } from "@/lib/gameArt";

// Ambient backdrop scoped to whichever section renders it (see .hero and
// .games-page-hero — both are `position: relative; overflow: hidden`, so
// this stays confined to that section instead of bleeding across the whole
// page/footer). Uses gameBackground rather than the wider gamesPageBanner
// dedicated art — that banner asset is a short, wide landscape crop, and
// background-size: cover on the full-viewport .hero had to zoom it in hard
// to fill the height, which read as distorted/over-cropped.
// key={slug} forces a remount on change so the fade-in animation replays.
export function AmbientGameBackground({ slug }: { slug: string | null }) {
  return (
    <div className="ambient-bg" aria-hidden="true">
      {slug && (
        <div key={slug} className="ambient-bg__layer" style={{ backgroundImage: `url(${gameBackground(slug)})` }} />
      )}
    </div>
  );
}
