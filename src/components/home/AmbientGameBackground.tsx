"use client";

import { gameBackground, gameBackgroundVideo } from "@/lib/gameArt";

// Ambient backdrop scoped to whichever section renders it (see .hero and
// .games-page-hero — both are `position: relative; overflow: hidden`, so
// this stays confined to that section instead of bleeding across the whole
// page/footer). Uses gameBackground rather than the wider gamesPageBanner
// dedicated art — that banner asset is a short, wide landscape crop, and
// background-size: cover on the full-viewport .hero had to zoom it in hard
// to fill the height, which read as distorted/over-cropped.
// key={slug} forces a remount on change so the fade-in animation replays.
export function AmbientGameBackground({ slug }: { slug: string | null }) {
  const videoSrc = slug ? gameBackgroundVideo(slug) : null;
  return (
    <div className="ambient-bg" aria-hidden="true">
      {slug && (
        <div
          key={slug}
          className="ambient-bg__layer"
          style={videoSrc ? undefined : { backgroundImage: `url(${gameBackground(slug)})` }}
        >
          {videoSrc && (
            // Same blitz.gg-style ambient clip, minus sound — muted is also
            // what lets it autoplay at all in every browser.
            // preload="none" so nothing is fetched before the element is
            // actually in play. With autoPlay set the browser still pulls
            // what it needs to start, so this is a hint rather than a
            // guarantee — the real saving was the files themselves (see
            // BACKGROUND_VIDEOS in lib/gameArt.ts). The poster is the same
            // still every other game gets, so the backdrop is never empty
            // while the clip is on its way.
            <video
              className="ambient-bg__video"
              src={videoSrc}
              poster={gameBackground(slug)}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
            />
          )}
        </div>
      )}
    </div>
  );
}
