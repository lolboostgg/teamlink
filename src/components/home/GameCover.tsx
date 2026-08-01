"use client";

import { useState, type CSSProperties } from "react";
import type { Game } from "@/lib/games";

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
          src={game.bannerUrl}
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
