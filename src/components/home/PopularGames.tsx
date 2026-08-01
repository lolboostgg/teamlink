import Link from "next/link";
import { GAMES } from "@/lib/games";
import { Reveal } from "@/components/ui/Reveal";

export function PopularGames() {
  return (
    <section className="section section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 460, height: 460, right: "-140px", top: "-120px" }} aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
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
        </Reveal>

        <div className="games-grid">
          {GAMES.map((game, i) => (
            <Reveal key={game.slug} delay={i * 60}>
              <Link href={`/games/${game.slug}`} className="game-card">
                <div
                  className="game-card__cover"
                  style={{
                    backgroundColor: game.tint,
                    backgroundImage: `linear-gradient(180deg, rgba(6,8,15,0) 35%, rgba(6,8,15,.9) 100%), url(${game.bannerUrl})`,
                  }}
                >
                  {game.name}
                </div>
                <div className="game-card__meta">
                  <span className="game-card__name">{game.shortName}</span>
                  <span className="game-card__players">{game.players}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
