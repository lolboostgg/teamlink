"use client";

import { useState, type CSSProperties } from "react";
import type { Game } from "@/lib/games";
import { localGameBanner, gameIcon } from "@/lib/gameArt";

interface Props {
  game: Game;
  showName?: boolean;
  compact?: boolean;
  className?: string;
  /** Use the clean square logo instead of the tall poster banner — for
   *  small tiles (hero picker, games grid) where the poster either gets
   *  cropped or, with object-fit: contain, letterboxes awkwardly. */
  iconMode?: boolean;
}

// Single source of truth for "what a game looks like" everywhere in the app
// (hero picker, games grid, booking header, dashboards) — a local, same-
// origin asset (public/games/, see lib/gameArt.ts), never a hotlink. The CSS
// tint+shortcode watermark is the fallback if the image itself 404s.
export function GameCover({ game, showName, compact, className, iconMode }: Props) {
  const [broken, setBroken] = useState(false);

  const style = { "--game-tint": game.tint } as CSSProperties;

  return (
    <div
      className={`game-cover${compact ? " game-cover--compact" : ""}${iconMode ? " game-cover--icon" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {!broken && (
        <img
          className={iconMode ? "game-cover__icon-img" : "game-cover__img"}
          src={iconMode ? gameIcon(game.slug) : localGameBanner(game.slug)}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      {broken && <span className="game-cover__code">{game.shortName}</span>}
      {!iconMode && <span className="game-cover__scrim" aria-hidden="true" />}
      {showName && <span className="game-cover__name">{game.name}</span>}
    </div>
  );
}
