import Link from "next/link";
import { GAMES } from "@/lib/games";
import { Reveal } from "@/components/ui/Reveal";
import { FloatingShapes } from "@/components/ui/FloatingShapes";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { GameCover } from "@/components/home/GameCover";
import { HeroMockups } from "@/components/home/HeroMockups";

// No hero photo — lolboost.gg's hotlinked art is one Cloudflare setting
// away from a 403 (confirmed, not hypothetical). Depth instead comes from
// floating UI mockup cards + soft glows, the same "show, don't photograph"
// technique tapin.gg and eloboost.gg use for their hero/feature sections.
export function Hero() {
  return (
    <section className="hero section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 520, height: 520, left: "-120px", top: "-160px" }} aria-hidden="true" />
      <span className="bg-glow bg-glow--teal" style={{ width: 420, height: 420, right: "-120px", top: "10%" }} aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <HeroMockups />
      <FloatingShapes />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <span className="hero__eyebrow">
            <span className="pulse-dot" aria-hidden="true" /> Matched in under 2 minutes
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="hero__title">
            Find your next <span className="hero__title-accent">teammate</span>, today.
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p className="hero__sub">
            Book a skilled, verified teammate for ranked grinding, casual games, or coaching —
            across all your favorite titles.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
            <TrustBadge />
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="game-picker">
            {GAMES.slice(0, 6).map((game) => (
              <Link key={game.slug} href={`/games/${game.slug}`} className="game-pick">
                <div className="game-pick__cover">
                  <GameCover game={game} compact />
                </div>
                <span className="game-pick__name">{game.name}</span>
                <span className="game-pick__players">{game.players} matched</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
