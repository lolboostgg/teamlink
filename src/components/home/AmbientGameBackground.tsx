"use client";

import { useActiveBackground } from "@/components/home/ActiveBackgroundProvider";
import { gameBackground } from "@/lib/gameArt";

// Full-page blurred backdrop that fades in behind the starfield-and-content
// layers when a game becomes active (hover/select). key={slug} forces a
// remount on change so the fade-in animation replays for the new image.
export function AmbientGameBackground() {
  const { activeSlug } = useActiveBackground();

  return (
    <div className="ambient-bg" aria-hidden="true">
      {activeSlug && (
        <div
          key={activeSlug}
          className="ambient-bg__layer"
          style={{ backgroundImage: `url(${gameBackground(activeSlug)})` }}
        />
      )}
    </div>
  );
}
