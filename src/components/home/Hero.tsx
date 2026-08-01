"use client";

import { useState } from "react";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { GameSwitcherBar } from "@/components/booking/GameSwitcherBar";
import { AmbientGameBackground } from "@/components/home/AmbientGameBackground";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { GAMES, getGameBySlug, type Game } from "@/lib/games";
import { useLastGameSlug } from "@/lib/lastGame";

interface Props {
  // Explicit on /games/[slug] (pinned to the URL); omitted on the homepage,
  // where it falls back to the last-selected game (or GAMES[0]) instead —
  // same component, same layout, just a different active game either way.
  game?: Game;
}

// tapin.gg-style single template: headline -> trust widget -> "choose game"
// carousel -> the full booking panel (modes, teammate picker, price/CTA
// sidebar), all in one place. /games/[slug] renders this exact same
// composition pinned to a specific game — see games/[slug]/layout.tsx.
export function Hero({ game: gameProp }: Props) {
  const lastSlug = useLastGameSlug();
  const game = gameProp ?? (lastSlug ? getGameBySlug(lastSlug) : undefined) ?? GAMES[0];
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);

  return (
    <>
      <section className="hero">
        <AmbientGameBackground slug={hoverSlug ?? game.slug} />
        <span className="hero__scrim" aria-hidden="true" />
        <span className="bg-glow bg-glow--blue" style={{ width: 560, height: 560, left: "50%", top: "-220px", transform: "translateX(-50%)" }} aria-hidden="true" />

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <span className="hero__eyebrow">
            <span className="pulse-dot" aria-hidden="true" /> Matched in under 2 minutes
          </span>

          <h1 className="hero__title">
            Play with a pro <span className="hero__title-accent">teammate</span>, right now.
          </h1>

          <p className="hero__sub">
            Pick a game, pick a mode, and get matched in under two minutes. No downloads, no waiting rooms.
          </p>

          <div className="hero__trust">
            <TrustBadge />
          </div>

          <GameSwitcherBar games={GAMES} activeSlug={game.slug} onHover={setHoverSlug} />
        </div>

        <div className="hero__scroll-cue" aria-hidden="true">
          <i className="fa-solid fa-chevron-down" />
        </div>
      </section>

      {/* Separate from .hero on purpose: .hero has overflow:hidden to mask
          the ambient backdrop, which per the CSS overflow spec would force
          overflow-y to auto too and break position:sticky on the booking
          sidebar below. See .glow-clip for the same fix applied here. */}
      <div className="booking-page" style={{ position: "relative" }}>
        <div className="glow-clip" aria-hidden="true">
          <span className="bg-glow bg-glow--teal" style={{ width: 360, height: 360, left: "-140px", bottom: "0" }} />
        </div>
        <div className="container booking-widget-wrap" style={{ position: "relative", zIndex: 1 }}>
          <BookingWidget game={game} />
        </div>
      </div>
    </>
  );
}
