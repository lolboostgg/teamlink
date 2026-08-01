"use client";

import type { Game } from "@/lib/games";
import { GameShowcaseCard } from "@/components/home/GameShowcaseCard";

interface Props {
  games: Game[];
  onHover?: (slug: string | null) => void;
}

// All games visible at once, no scrolling — the /games listing is the
// dedicated "browse everything" page, so unlike the homepage/booking-page
// sliders it shows the full catalog up front.
export function GamesFullGrid({ games, onHover }: Props) {
  return (
    <div className="games-full-grid">
      {games.map((game) => (
        <GameShowcaseCard key={game.slug} game={game} onHover={onHover} className="games-full-grid__card" />
      ))}
    </div>
  );
}
