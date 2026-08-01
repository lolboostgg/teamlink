"use client";

import { useState } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import { BOOKING_CATEGORIES } from "@/lib/bookingOptions";
import { GameCover } from "@/components/home/GameCover";
import { PriceTag } from "@/components/currency/PriceTag";

// Compact, embedded booking preview for the hero — mirrors tapin.gg's
// actual homepage pattern of putting the game+mode+price picker directly
// in the hero instead of sending visitors to a separate page first.
export function QuickBookCard() {
  const [activeGame, setActiveGame] = useState(GAMES[0]);
  const options = BOOKING_CATEGORIES[0].options;
  const [activeOption, setActiveOption] = useState(options[0]);

  return (
    <div className="quickbook">
      <div className="quickbook__games">
        {GAMES.slice(0, 6).map((game) => (
          <button
            key={game.slug}
            type="button"
            className={`quickbook__game${game.slug === activeGame.slug ? " is-active" : ""}`}
            onClick={() => setActiveGame(game)}
            aria-label={game.name}
            title={game.name}
          >
            <GameCover game={game} compact />
            {game.slug === activeGame.slug && (
              <i className="fa-solid fa-check quickbook__game-check" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      <div className="quickbook__title">{activeGame.name}</div>

      <div className="quickbook__options">
        {options.map((option) => (
          <button
            key={option.name}
            type="button"
            className={`quickbook__option${option.name === activeOption.name ? " is-active" : ""}`}
            onClick={() => setActiveOption(option)}
          >
            <span>{option.name}</span>
            <PriceTag amountEUR={option.price} />
          </button>
        ))}
      </div>

      <Link href={`/games/${activeGame.slug}`} className="btn btn--primary btn--block quickbook__cta">
        <i className="fa-solid fa-bolt" aria-hidden="true" />
        Play now — <PriceTag amountEUR={activeOption.price} />
      </Link>
    </div>
  );
}
