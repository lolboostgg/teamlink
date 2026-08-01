"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import { heroCardBackground, heroCardWordmark } from "@/lib/gameArt";
import { setLastGameSlug } from "@/lib/lastGame";

interface Props {
  games: Game[];
  activeSlug: string;
  onHover?: (slug: string | null) => void;
}

// The one canonical "choose game" carousel — used both on the homepage and
// on every /games/[slug] page (see Hero.tsx), since both now render the
// exact same hero+booking composition. Cards are plain Links, so switching
// games is a real navigation (URL updates, deep-linkable) rather than local
// state; on /games/[slug] that lands back in the same layout, so only the
// content re-renders instead of the whole page flashing.
export function GameSwitcherBar({ games, activeSlug, onHover }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Whichever game is actually active becomes "the last game", regardless
  // of how the visitor got here (this carousel, the /games listing, a
  // direct link) — restored as the pre-selected homepage card next visit.
  useEffect(() => {
    setLastGameSlug(activeSlug);
  }, [activeSlug]);

  // The active card can be scrolled out of view (e.g. landing directly on
  // a game further down the roster, like Marvel Rivals) — keep it visible
  // whenever it changes instead of leaving the track wherever it happened
  // to rest.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
  }, [activeSlug]);

  function scrollBy(delta: number) {
    trackRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="hero-carousel">
      <div className="hero-carousel__track" ref={trackRef} onMouseLeave={() => onHover?.(null)}>
        {games.map((game) => {
          const wordmark = heroCardWordmark(game.slug);
          const isActive = game.slug === activeSlug;
          return (
            <Link
              key={game.slug}
              ref={isActive ? activeRef : undefined}
              href={`/games/${game.slug}`}
              className={`hero-card${isActive ? " is-active" : ""}`}
              onMouseEnter={() => onHover?.(game.slug)}
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
              </div>
            </Link>
          );
        })}
      </div>

      <button type="button" className="hero-carousel__prev" onClick={() => scrollBy(-300)} aria-label="Show previous games">
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>
      <button type="button" className="hero-carousel__next" onClick={() => scrollBy(300)} aria-label="Show more games">
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
