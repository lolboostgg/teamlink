"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { HeroGameCarousel } from "@/components/home/HeroGameCarousel";
import { PriceTag } from "@/components/currency/PriceTag";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { AmbientGameBackground } from "@/components/home/AmbientGameBackground";
import { GAMES, getGameBySlug, type Game } from "@/lib/games";
import { BOOKING_CATEGORIES } from "@/lib/bookingOptions";
import { setLastGameSlug, useLastGameSlug } from "@/lib/lastGame";

// Centered hero, closer to tapin.gg's actual homepage flow: headline -> trust
// widget -> "choose game" picker (big key-art cards) -> mode + price -> one
// CTA. No side card, no decorative globe/floating cards — the picker and
// price panel carry the visual weight instead.
export function Hero() {
  // Restore whichever game the user had picked last time, like tapin.gg
  // pre-selecting the last-used card on return visits. useLastGameSlug's
  // server snapshot is always null, so first paint matches everywhere and
  // React swaps in the real localStorage value right after hydration —
  // once the visitor manually picks a card, that choice wins instead.
  const lastSlug = useLastGameSlug();
  const [manualGame, setManualGame] = useState<Game | null>(null);
  const activeGame = manualGame ?? (lastSlug ? getGameBySlug(lastSlug) : undefined) ?? GAMES[0];

  const options = BOOKING_CATEGORIES[0].options;
  const [activeOption, setActiveOption] = useState(options[0]);
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);

  function selectGame(game: Game) {
    setManualGame(game);
    setLastGameSlug(game.slug);
  }

  return (
    <section className="hero">
      <AmbientGameBackground slug={hoverSlug ?? activeGame.slug} />
      <span className="hero__scrim" aria-hidden="true" />
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
            Play with a pro <span className="hero__title-accent">teammate</span>, right now.
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
          <HeroGameCarousel
            games={GAMES}
            activeSlug={activeGame.slug}
            onSelect={selectGame}
            onHover={setHoverSlug}
          />
        </Reveal>

        <Reveal delay={320}>
          <div className="hero-modes-wrap">
            <div className="hero-modes-title">{activeGame.name} · pick a mode</div>
            <div className="hero-modes">
              {options.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={`hero-mode${option.name === activeOption.name ? " is-active" : ""}`}
                  onClick={() => setActiveOption(option)}
                >
                  <span className="hero-mode__name">
                    {option.name}
                    <InfoTooltip text={option.description} />
                  </span>
                  <span className="hero-mode__price">
                    <PriceTag amountEUR={option.price} /> {option.unit}
                  </span>
                </button>
              ))}
            </div>

            <div className="hero-cta">
              <Link href={`/games/${activeGame.slug}`} className="btn btn--vivid btn--block">
                <i className="fa-solid fa-bolt" aria-hidden="true" />
                Play now for <PriceTag amountEUR={activeOption.price} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
