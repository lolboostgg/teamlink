import type { Game } from "@/lib/games";
import { heroCardBackground } from "@/lib/gameArt";

// Full-bleed key-art banner at the top of the game page — the booking
// widget below used to be the only thing on the page, which read as flat
// and empty. This gives each game page an identity before the user even
// scrolls to pricing. Uses the same landscape art as the hero carousel
// (falls back to the tall poster, cover-cropped, for the couple of games
// without dedicated landscape art) instead of the old small right-anchored
// contain treatment, which read as a stray floating thumbnail.
export function GamePageHero({ game }: { game: Game }) {
  return (
    <div className="game-page-hero" style={{ backgroundImage: `url(${heroCardBackground(game.slug)})` }}>
      <div className="game-page-hero__scrim" aria-hidden="true" />
      <div className="container game-page-hero__inner">
        <span className="game-page-hero__eyebrow">
          <span className="pulse-dot" aria-hidden="true" /> {game.players} players matched
        </span>
        <h1 className="game-page-hero__title">{game.name}</h1>
        <div className="game-page-hero__stats">
          <span>
            <i className="fa-solid fa-star" aria-hidden="true" /> 4.9 rating
          </span>
          <span>
            <i className="fa-regular fa-clock" aria-hidden="true" /> ~1 min average wait
          </span>
          <span>
            <i className="fa-solid fa-shield-halved" aria-hidden="true" /> Verified teammates
          </span>
        </div>
      </div>
    </div>
  );
}
