"use client";

import { useEffect, useState } from "react";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { GameSwitcherBar } from "@/components/booking/GameSwitcherBar";
import { AmbientGameBackground } from "@/components/home/AmbientGameBackground";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { GAMES, getGameBySlug, type Game } from "@/lib/games";
import { useLastGameSlug } from "@/lib/lastGame";
import { getPreviousPathname } from "@/lib/routeHistory";

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
  const gameSlugProp = gameProp?.slug;

  // Only jump straight to the booking panel when the visitor actually
  // came from browsing /games — that's the one case where they've already
  // expressed intent and the marketing hero is pure friction. A reload, a
  // direct link, or switching games from within this same page should all
  // leave scroll position alone. getPreviousPathname() reflects real
  // in-app navigation history (see RouteTracker) and is null on a fresh
  // load, so reloads/direct visits never qualify.
  useEffect(() => {
    if (!gameSlugProp) return;
    if (getPreviousPathname() !== "/games") return;
    document.getElementById("booking")?.scrollIntoView({ behavior: "instant" });
  }, [gameSlugProp]);

  return (
    <>
      <section className="hero">
        <AmbientGameBackground slug={hoverSlug ?? game.slug} />
        <span className="hero__scrim" aria-hidden="true" />
        <span className="hero__fade-out" aria-hidden="true" />
        <span className="bg-glow bg-glow--blue" style={{ width: 560, height: 560, left: "50%", top: "-220px", transform: "translateX(-50%)" }} aria-hidden="true" />
        <span className="bg-glow bg-glow--teal" style={{ width: 420, height: 420, left: "12%", top: "30%" }} aria-hidden="true" />
        <span className="bg-glow bg-glow--blue" style={{ width: 380, height: 380, right: "8%", top: "6%" }} aria-hidden="true" />

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

          <div className="hero__cta">
            <button
              type="button"
              className="btn btn--vivid btn--lg"
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <i className="fa-solid fa-bolt" aria-hidden="true" /> Play now
            </button>
            <a href="#how-it-works" className="btn btn--ghost btn--lg">
              How it works
            </a>
          </div>

          <div className="hero__trust">
            <TrustBadge />
          </div>

          <GameSwitcherBar games={GAMES} activeSlug={game.slug} onHover={setHoverSlug} />
        </div>

        <button
          type="button"
          className="hero__scroll-cue"
          aria-label="Scroll to booking"
          onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <i className="fa-solid fa-chevron-down" aria-hidden="true" />
        </button>
      </section>

      {/* Separate from .hero on purpose: .hero has overflow:hidden to mask
          the ambient backdrop, which per the CSS overflow spec would force
          overflow-y to auto too and break position:sticky on the booking
          sidebar below. */}
      <div id="booking" className="booking-page" style={{ position: "relative" }}>
        <div className="container booking-widget-wrap" style={{ position: "relative", zIndex: 1 }}>
          <BookingWidget game={game} />
        </div>
      </div>
    </>
  );
}
