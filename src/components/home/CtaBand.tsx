"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { GAMES, getGameBySlug } from "@/lib/games";
import { gameBackground } from "@/lib/gameArt";
import { useLastGameSlug } from "@/lib/lastGame";

export function CtaBand() {
  const { open } = useAuthModal();
  const lastSlug = useLastGameSlug();
  const game = (lastSlug ? getGameBySlug(lastSlug) : undefined) ?? GAMES[0];

  return (
    <section className="cta-band section-relative" style={{ backgroundImage: `url(${gameBackground(game.slug)})` }}>
      <span className="cta-band__scrim" aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <h2 className="cta-band__title">Ready to find your teammate?</h2>
          <p className="cta-band__sub">Get matched in under two minutes, no commitment, cancel anytime.</p>
          <div className="cta-band__actions">
            <Link className="btn btn--primary" href="/games">
              Browse games
            </Link>
            <button type="button" className="btn btn--outline" onClick={() => open("signup")}>
              Create free account
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
