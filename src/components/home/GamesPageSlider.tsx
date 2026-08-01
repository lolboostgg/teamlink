"use client";

import { useRef } from "react";
import type { Game } from "@/lib/games";
import { GameShowcaseCard } from "@/components/home/GameShowcaseCard";

interface Props {
  games: Game[];
  onHover?: (slug: string | null) => void;
}

// Same big-card, full-bleed-art treatment as the homepage/booking-page
// game switcher (see GameSwitcherBar) — cards here are bigger since this
// page has more room, and each one is a direct link instead of an inline
// selector.
export function GamesPageSlider({ games, onHover }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollNext() {
    trackRef.current?.scrollBy({ left: 360, behavior: "smooth" });
  }

  return (
    <div className="games-slider">
      <div className="games-slider__track" ref={trackRef}>
        {games.map((game) => (
          <GameShowcaseCard key={game.slug} game={game} onHover={onHover} className="games-slider__card" />
        ))}
      </div>

      <button type="button" className="hero-carousel__next games-slider__next" onClick={scrollNext} aria-label="Show more games">
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
