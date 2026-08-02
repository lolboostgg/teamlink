"use client";

import Link from "next/link";
import type { Game } from "@/lib/games";
import { heroCardBackground, heroCardWordmark } from "@/lib/gameArt";

interface Props {
  game: Game;
  onHover?: (slug: string | null) => void;
  className?: string;
}

// Shared big-card markup (key art + wordmark) used by the horizontal
// sliders (GamesPageSlider), the full non-scrolling grid (GamesFullGrid),
// and matches GameSwitcherBar's hero-carousel cards exactly — same
// heroCardBackground art source, so a game looks identical everywhere
// it's picked from instead of using a differently-cropped banner here.
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
      <img className="hero-card__bg" src={heroCardBackground(game.slug)} alt="" loading="lazy" />
      <span className="hero-card__scrim" aria-hidden="true" />
      <div className="hero-card__footer">
        {wordmark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero-card__wordmark" src={wordmark} alt={game.name} />
        ) : (
          <span className="hero-card__name-text">{game.name}</span>
        )}
      </div>
    </Link>
  );
}
