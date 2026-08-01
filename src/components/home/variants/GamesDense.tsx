import Link from "next/link";
import { GAMES } from "@/lib/games";
import { Reveal } from "@/components/ui/Reveal";

// Denser grid (more columns, smaller cards, stat icon row) — eloboost.gg
// packs far more games per row than Variant A's larger showcase cards.
export function GamesDense() {
  return (
    <section className="section" id="games">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">Popular games</div>
            <h2 className="section__title">One platform for every game.</h2>
          </div>
        </Reveal>

        <div className="games-dense">
          {GAMES.map((game, i) => (
            <Reveal key={game.slug} delay={i * 40}>
              <Link href={`/games/${game.slug}`} className="games-dense__card">
                <div
                  className="games-dense__cover"
                  style={{
                    backgroundColor: game.tint,
                    backgroundImage: `linear-gradient(180deg, rgba(6,8,15,0) 40%, rgba(6,8,15,.92) 100%), url(${game.bannerUrl})`,
                  }}
                >
                  <span>{game.name}</span>
                </div>
                <div className="games-dense__stats">
                  <span><i className="fa-solid fa-gamepad" aria-hidden="true" /> {game.players}</span>
                  <span><i className="fa-solid fa-star" aria-hidden="true" /> 4.9</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
