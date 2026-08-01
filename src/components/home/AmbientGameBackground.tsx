"use client";

import { gameBackground } from "@/lib/gameArt";

// Blurred backdrop scoped to whichever section renders it (see .hero and
// .games-page-hero — both are `position: relative; overflow: hidden`, so
// this stays confined to that section instead of bleeding across the whole
// page/footer). key={slug} forces a remount on change so the fade-in
// animation replays for the new image.
export function AmbientGameBackground({ slug }: { slug: string | null }) {
  return (
    <div className="ambient-bg" aria-hidden="true">
      {slug && (
        <div key={slug} className="ambient-bg__layer" style={{ backgroundImage: `url(${gameBackground(slug)})` }} />
      )}
    </div>
  );
}
