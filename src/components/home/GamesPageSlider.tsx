"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import { gamesPageBanner, heroCardWordmark } from "@/lib/gameArt";

interface Props {
  games: Game[];
  onHover: (slug: string | null) => void;
}

// Same big-card, full-bleed-art treatment as the homepage hero carousel
// (see HeroGameCarousel) — cards here are bigger since this page has more
// room, and each one is a direct link instead of an inline selector.
export function GamesPageSlider({ games, onHover }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollNext() {
    trackRef.current?.scrollBy({ left: 360, behavior: "smooth" });
  }

  return (
    <div className="games-slider">
      <div className="games-slider__track" ref={trackRef} onMouseLeave={() => onHover(null)}>
        {games.map((game) => {
          const wordmark = heroCardWordmark(game.slug);
          return (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="hero-card games-slider__card"
              onMouseEnter={() => onHover(game.slug)}
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
        })}
      </div>

      <button type="button" className="hero-carousel__next games-slider__next" onClick={scrollNext} aria-label="Show more games">
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
