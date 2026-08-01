import Link from "next/link";
import { GAMES } from "@/lib/games";
import { LOLBOOST_ASSETS } from "@/lib/assets";
import { Reveal } from "@/components/ui/Reveal";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true">
        <img src={`${LOLBOOST_ASSETS}/landing/lolboost-hero-multigame6.webp`} alt="" loading="eager" fetchPriority="high" />
      </div>

      <div className="container">
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
          <div className="hero__trust">
            <span className="hero__trust-stars">★★★★★</span>
            <span>4.9/5 · 2,400+ reviews</span>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="game-picker">
            {GAMES.slice(0, 6).map((game) => (
              <Link key={game.slug} href={`/games/${game.slug}`} className="game-pick">
                <span
                  className="game-pick__cover"
                  style={{
                    backgroundColor: game.tint,
                    backgroundImage: `linear-gradient(180deg, rgba(6,8,15,0) 30%, rgba(6,8,15,.85) 100%), url(${game.bannerUrl})`,
                  }}
                />
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
