"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Game } from "@/lib/games";
import { heroCardBackground } from "@/lib/gameArt";

interface Props {
  game: Game;
  onHover?: (slug: string | null) => void;
  className?: string;
  /** Extra detail under the name — the /games listing passes availability and
   *  price here. The sliders pass nothing and are unchanged by it. */
  meta?: ReactNode;
}

// Shared big-card markup (key art + name) used by the full non-scrolling
// grid (GamesFullGrid), the 404 game picks, and
// matches GameSwitcherBar's hero-carousel cards exactly — same
// heroCardBackground art source, so a game looks identical everywhere
// it's picked from instead of using a differently-cropped banner here.
// Always a plain text label, never the old stylized wordmark overlay — the
// banner key art already has each game's logo baked in, so the wordmark was
// just doubling up the branding (and doing it inconsistently, since only
// some games had a dedicated wordmark asset).
/** Steps down so the longest names still fit a card on one line. */
function nameSize(name: string): string {
  if (name.length <= 13) return "14px";
  if (name.length <= 17) return "12.5px";
  if (name.length <= 21) return "11px";
  return "10px";
}

export function GameShowcaseCard({ game, onHover, className = "", meta }: Props) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className={`hero-card${meta ? " hero-card--detailed" : ""}${className ? ` ${className}` : ""}`}
      onMouseEnter={() => onHover?.(game.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-card__bg" src={heroCardBackground(game.slug)} alt="" loading="lazy" />
      <span className="hero-card__scrim" aria-hidden="true" />
      <div className="hero-card__footer">
        {/* One line, always. "COD: Black Ops 7" wrapped onto two and pushed
            the card's own bottom edge past the art; the long names are the
            new ones, so this only gets worse as the catalogue grows. CSS
            cannot shrink text to fit, so the size steps down by length —
            deterministic, and no measuring pass that reflows after paint. */}
        <span className="hero-card__name-text" style={{ fontSize: nameSize(game.name) }}>
          {game.name}
        </span>
        {meta && <span className="hero-card__meta">{meta}</span>}
      </div>
    </Link>
  );
}
