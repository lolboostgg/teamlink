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

// Single source of truth for "what a game looks like" everywhere in the
// app (hero picker, games grid, booking header, quick-book widget). Tries
// the real banner art, but never depends on it: lolboost.gg's Cloudflare
// bot-challenge can 403 image requests at any time (confirmed — it isn't
// hypothetical), so a failed load falls back to a consistent, deliberately
// designed treatment (dark card, colored accent border, giant faint
// short-code watermark) instead of the old bare tint-color rectangle.
// This is also *the* fix for "the background looks inconsistent": every
// card now shares the same structure regardless of whether art loads.
// Three-tier fallback: hotlinked lolboost.gg banner -> local hand-authored
// SVG (public/games/{slug}.svg, see lib/gameArt.ts) -> CSS tint+shortcode
// watermark as the final safety net. Tier 0 is the common case; tier 1 is
// the actual fix for hotlink unreliability; tier 2 only fires if even the
// local asset is somehow missing.
export function GameCover({ game, showName, compact, className }: Props) {
  const [tier, setTier] = useState<0 | 1 | 2>(0);

  const style = { "--game-tint": game.tint } as CSSProperties;
  const src = tier === 0 ? game.bannerUrl : localGameBanner(game.slug);

  return (
    <div
      className={`game-cover${compact ? " game-cover--compact" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {tier < 2 && (
        <img
          className="game-cover__img"
          src={src}
          alt=""
          loading="lazy"
          onError={() => setTier((t) => (t === 0 ? 1 : 2))}
        />
      )}
      {tier === 2 && <span className="game-cover__code">{game.shortName}</span>}
      <span className="game-cover__scrim" aria-hidden="true" />
      {showName && <span className="game-cover__name">{game.name}</span>}
    </div>
  );
}
