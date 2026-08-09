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

// Shared big-card markup (key art + name) used by the horizontal sliders
// (GamesPageSlider), the full non-scrolling grid (GamesFullGrid), and
// matches GameSwitcherBar's hero-carousel cards exactly — same
// heroCardBackground art source, so a game looks identical everywhere
// it's picked from instead of using a differently-cropped banner here.
// Always a plain text label, never the old stylized wordmark overlay — the
// banner key art already has each game's logo baked in, so the wordmark was
// just doubling up the branding (and doing it inconsistently, since only
// some games had a dedicated wordmark asset).
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
        <span className="hero-card__name-text">{game.name}</span>
        {meta && <span className="hero-card__meta">{meta}</span>}
      </div>
    </Link>
  );
}
