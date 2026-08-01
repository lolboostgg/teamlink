"use client";

import { useState, type CSSProperties } from "react";
import type { Game } from "@/lib/games";
import { localGameBanner } from "@/lib/gameArt";

interface Props {
  game: Game;
  showName?: boolean;
  compact?: boolean;
  className?: string;
}

// Single source of truth for "what a game looks like" everywhere in the app
// (hero picker, games grid, booking header, dashboards). Renders the local
// hand-authored SVG banner (public/games/{slug}.svg, see lib/gameArt.ts) —
// NOT the previous lolboost.gg hotlink: verified during testing that when
// lolboost.gg blocks the request (Cross-Origin-Resource-Policy), Chromium
// leaves the <img> in a `complete=true, naturalWidth=0` state without
// reliably firing `onerror`, so the old onError-based fallback silently
// rendered a blank box instead of recovering. A local, same-origin asset
// can't have that failure mode. The CSS tint+shortcode watermark stays as
// the final safety net for the (now very unlikely) case the SVG itself
// 404s.
export function GameCover({ game, showName, compact, className }: Props) {
  const [broken, setBroken] = useState(false);

  const style = { "--game-tint": game.tint } as CSSProperties;

  return (
    <div
      className={`game-cover${compact ? " game-cover--compact" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {!broken && (
        <img
          className="game-cover__img"
          src={localGameBanner(game.slug)}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      {broken && <span className="game-cover__code">{game.shortName}</span>}
      <span className="game-cover__scrim" aria-hidden="true" />
      {showName && <span className="game-cover__name">{game.name}</span>}
    </div>
  );
}
