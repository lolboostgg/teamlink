"use client";

import Link from "next/link";
import type { Game } from "@/lib/games";
import { gamesPageBanner, heroCardWordmark } from "@/lib/gameArt";

interface Props {
  game: Game;
  onHover?: (slug: string | null) => void;
  className?: string;
}

// Shared big-card markup (key art + wordmark + stats) used by both the
// horizontal sliders (GamesPageSlider) and the full, non-scrolling grid
// (GamesFullGrid) — same visual language, different container layout.
export function GameShowcaseCard({ game, onHover, className = "" }: Props) {
  const wordmark = heroCardWordmark(game.slug);
  return (
    <Link
      href={`/games/${game.slug}`}
      className={`hero-card${className ? ` ${className}` : ""}`}
      onMouseEnter={() => onHover?.(game.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-card__bg" src={gamesPageBanner(game.slug)} alt="" loading="lazy" />
      <span className="hero-card__scrim" aria-hidden="true" />
      <div className="hero-card__footer">
        {wordmark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero-card__wordmark" src={wordmark} alt={game.name} />
        ) : (
          <span className="hero-card__name-text">{game.name}</span>
        )}
        <span className="hero-card__players">
          <i className="fa-solid fa-user-group" aria-hidden="true" /> {game.players}
          <i className="fa-solid fa-star games-slider__rating-star" aria-hidden="true" /> 4.9
        </span>
      </div>
    </Link>
  );
}
