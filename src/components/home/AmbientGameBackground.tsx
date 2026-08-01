"use client";

import { gamesPageBanner } from "@/lib/gameArt";

// Ambient backdrop scoped to whichever section renders it (see .hero and
// .games-page-hero — both are `position: relative; overflow: hidden`, so
// this stays confined to that section instead of bleeding across the whole
// page/footer). Uses gamesPageBanner (the ~1920x500 dedicated art) rather
// than the older, lower-res gameBackground asset — .hero is full-viewport
// height now, so a smaller source visibly softened stretched that tall.
// key={slug} forces a remount on change so the fade-in animation replays.
export function AmbientGameBackground({ slug }: { slug: string | null }) {
  return (
    <div className="ambient-bg" aria-hidden="true">
      {slug && (
        <div key={slug} className="ambient-bg__layer" style={{ backgroundImage: `url(${gamesPageBanner(slug)})` }} />
      )}
    </div>
  );
}
