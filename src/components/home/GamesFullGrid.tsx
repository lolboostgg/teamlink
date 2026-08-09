"use client";

import type { Game } from "@/lib/games";
import { GameShowcaseCard } from "@/components/home/GameShowcaseCard";

/** A game plus what the listing needs to make it choosable. */
export interface GameListing extends Game {
  /** Teammates who could take an order in this game right now. */
  online: number;
  priceFromEUR: number | null;
  modes: number;
}

const EUR = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

interface Props {
  games: GameListing[];
  onHover?: (slug: string | null) => void;
}

// All games visible at once, no scrolling — the /games listing is the
// dedicated "browse everything" page, so unlike the homepage/booking-page
// sliders it shows the full catalog up front.
//
// Each card carries the three facts that actually decide the choice. The
// listing used to be art and a name, which meant it answered only "which
// game do I play" — the one thing every visitor already knew.
export function GamesFullGrid({ games, onHover }: Props) {
  return (
    <div className="games-full-grid">
      {games.map((game) => (
        <GameShowcaseCard
          key={game.slug}
          game={game}
          onHover={onHover}
          className="games-full-grid__card"
          meta={
            <>
              {game.online > 0 ? (
                <span className="hero-card__live">
                  <span className="hero-card__live-dot" aria-hidden="true" />
                  {game.online} online
                </span>
              ) : (
                /* Said outright rather than left blank. A teammate can be
                   booked either way — the order waits for one to come online
                   — and a card with nothing where the others have a number
                   reads as broken. */
                <span className="hero-card__live hero-card__live--none">No one online</span>
              )}
              <span className="hero-card__facts">
                {game.priceFromEUR !== null && (
                  <span>
                    from <b>{EUR.format(game.priceFromEUR)}</b>
                  </span>
                )}
                <span>
                  {game.modes} mode{game.modes === 1 ? "" : "s"}
                </span>
              </span>
            </>
          }
        />
      ))}
    </div>
  );
}
