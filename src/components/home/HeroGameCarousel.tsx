"use client";

import { useRef } from "react";
import type { Game } from "@/lib/games";
import { heroCardBackground, heroCardWordmark } from "@/lib/gameArt";

interface Props {
  games: Game[];
  activeSlug: string;
  onSelect: (game: Game) => void;
  onHover: (slug: string | null) => void;
}

// tapin.gg-style horizontal carousel: wide full-bleed key art cards with a
// stylized wordmark overlay instead of the small square-icon tiles, since
// at this larger card size the poster/landscape art actually reads well.
export function HeroGameCarousel({ games, activeSlug, onSelect, onHover }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollNext() {
    trackRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  }

  return (
    <div className="hero-carousel">
      <div className="hero-carousel__track" ref={trackRef} onMouseLeave={() => onHover(null)}>
        {games.map((game) => {
          const wordmark = heroCardWordmark(game.slug);
          const isActive = game.slug === activeSlug;
          return (
            <button
              key={game.slug}
              type="button"
              className={`hero-card${isActive ? " is-active" : ""}`}
              onClick={() => onSelect(game)}
              onMouseEnter={() => onHover(game.slug)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-card__bg" src={heroCardBackground(game.slug)} alt="" loading="lazy" />
              <span className="hero-card__scrim" aria-hidden="true" />
              {isActive && <i className="fa-solid fa-check hero-card__check" aria-hidden="true" />}
              <div className="hero-card__footer">
                {wordmark ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="hero-card__wordmark" src={wordmark} alt={game.name} />
                ) : (
                  <span className="hero-card__name-text">{game.name}</span>
                )}
                <span className="hero-card__players">
                  <i className="fa-solid fa-user-group" aria-hidden="true" /> {game.players}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button type="button" className="hero-carousel__next" onClick={scrollNext} aria-label="Show more games">
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
