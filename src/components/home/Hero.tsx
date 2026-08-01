import Link from "next/link";
import { GAMES } from "@/lib/games";

export function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <span className="hero__eyebrow">
          <i className="fa-solid fa-bolt" aria-hidden="true" /> Matched in under 2 minutes
        </span>

        <h1 className="hero__title">
          Find your next <span className="hero__title-accent">teammate</span>, today.
        </h1>

        <p className="hero__sub">
          Book a skilled, verified teammate for ranked grinding, casual games, or coaching —
          across all your favorite titles.
        </p>

        <div className="hero__trust">
          <span className="hero__trust-stars">★★★★★</span>
          <span>4.9/5 · 2,400+ reviews</span>
        </div>

        <div className="game-picker">
          {GAMES.slice(0, 6).map((game) => (
            <Link key={game.slug} href={`/games/${game.slug}`} className="game-pick">
              <span className="game-pick__cover" style={{ background: game.tint }}>
                {game.shortName}
              </span>
              <span className="game-pick__name">{game.name}</span>
              <span className="game-pick__players">{game.players} matched</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
