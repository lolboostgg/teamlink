"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import { heroCardBackground, heroCardWordmark } from "@/lib/gameArt";
import { setLastGameSlug } from "@/lib/lastGame";

interface Props {
  games: Game[];
  activeSlug: string;
}

// Persistent "choose game" strip for every booking page. It lives in
// games/[slug]/layout.tsx, which Next.js does not remount when only the
// dynamic slug changes — so clicking another game here is a plain Link
// navigation (real URL, deep-linkable), but visually only the booking
// panel below re-renders instead of the whole page flashing/reloading.
export function GameSwitcherBar({ games, activeSlug }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Whichever game page is actually being viewed becomes "the last game",
  // regardless of how the visitor got here (switcher, listing, direct link).
  useEffect(() => {
    setLastGameSlug(activeSlug);
  }, [activeSlug]);

  function scrollNext() {
    trackRef.current?.scrollBy({ left: 260, behavior: "smooth" });
  }

  return (
    <div className="hero-carousel game-switcher">
      <div className="hero-carousel__track" ref={trackRef}>
        {games.map((game) => {
          const wordmark = heroCardWordmark(game.slug);
          const isActive = game.slug === activeSlug;
          return (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className={`hero-card${isActive ? " is-active" : ""}`}
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

      <button type="button" className="hero-carousel__next" onClick={scrollNext} aria-label="Show more games">
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
