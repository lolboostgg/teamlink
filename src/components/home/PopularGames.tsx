import Link from "next/link";
import { GAMES } from "@/lib/games";

export function PopularGames() {
  return (
    <section className="section">
      <div className="container">
        <div className="section__head">
          <div>
            <div className="section__eyebrow">Popular games</div>
            <h2 className="section__title">Pick a game, get matched.</h2>
            <p className="section__sub">
              Every teammate is reviewed and ranked before they can play with you.
            </p>
          </div>
          <Link className="btn btn--outline btn--sm" href="/games">
            View all games <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>

        <div className="games-grid">
          {GAMES.map((game) => (
            <Link key={game.slug} href={`/games/${game.slug}`} className="game-card">
              <div className="game-card__cover" style={{ background: game.tint }}>
                {game.name}
              </div>
              <div className="game-card__meta">
                <span className="game-card__name">{game.shortName}</span>
                <span className="game-card__players">{game.players}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
