"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { GameCover } from "@/components/home/GameCover";
import { PriceTag } from "@/components/currency/PriceTag";
import { GAMES } from "@/lib/games";
import { BOOKING_CATEGORIES } from "@/lib/bookingOptions";

// Centered hero, closer to tapin.gg's actual homepage flow: headline -> trust
// widget -> "choose game" picker (big key-art cards) -> mode + price -> one
// CTA. No side card, no decorative globe/floating cards — the picker and
// price panel carry the visual weight instead.
export function Hero() {
  const [activeGame, setActiveGame] = useState(GAMES[0]);
  const options = BOOKING_CATEGORIES[0].options;
  const [activeOption, setActiveOption] = useState(options[0]);

  return (
    <section className="hero">
      <span className="bg-glow bg-glow--blue" style={{ width: 560, height: 560, left: "50%", top: "-220px", transform: "translateX(-50%)" }} aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <span className="hero__eyebrow">
            <span className="pulse-dot" aria-hidden="true" /> Matched in under 2 minutes
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="hero__title">
            Play with a pro <span className="hero__title-accent">teammate</span> — right now.
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p className="hero__sub">
            Pick a game, pick a mode, and get matched in under two minutes. No downloads, no waiting rooms.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="hero__trust">
            <TrustBadge />
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="game-picker">
            {GAMES.slice(0, 6).map((game) => (
              <button
                key={game.slug}
                type="button"
                className={`game-pick${game.slug === activeGame.slug ? " is-active" : ""}`}
                onClick={() => setActiveGame(game)}
              >
                <div className="game-pick__cover">
                  <GameCover game={game} />
                  {game.slug === activeGame.slug && (
                    <i className="fa-solid fa-check game-pick__check" aria-hidden="true" />
                  )}
                </div>
                <div className="game-pick__meta">
                  <span className="game-pick__name">{game.name}</span>
                  <span className="game-pick__players">
                    <i className="fa-solid fa-circle" aria-hidden="true" /> {game.players}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="hero-modes-wrap">
            <div className="hero-modes-title">{activeGame.name} — select a mode</div>
            <div className="hero-modes">
              {options.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={`hero-mode${option.name === activeOption.name ? " is-active" : ""}`}
                  onClick={() => setActiveOption(option)}
                >
                  <span className="hero-mode__name">{option.name}</span>
                  <span className="hero-mode__price">
                    <PriceTag amountEUR={option.price} /> {option.unit}
                  </span>
                </button>
              ))}
            </div>

            <div className="hero-cta">
              <Link href={`/games/${activeGame.slug}`} className="btn btn--vivid btn--block">
                <i className="fa-solid fa-bolt" aria-hidden="true" />
                Play now — <PriceTag amountEUR={activeOption.price} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
