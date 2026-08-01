import type { Metadata } from "next";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import { GameCover } from "@/components/home/GameCover";

export const metadata: Metadata = {
  title: "All Games",
  description: "Book a teammate for any of our supported games.",
};

export default function GamesPage() {
  return (
    <main className="section">
      <div className="container">
        <div className="section__head section__head--center">
          <div className="section__eyebrow">All games</div>
          <h1 className="section__title">Choose your game</h1>
          <p className="section__sub">Pick a game to see available teammates, modes, and pricing.</p>
        </div>

        <div className="games-grid">
          {GAMES.map((game) => (
            <Link key={game.slug} href={`/games/${game.slug}`} className="game-card">
              <div className="game-card__cover">
                <GameCover game={game} showName />
              </div>
              <div className="game-card__meta">
                <span className="game-card__name">{game.shortName}</span>
                <span className="game-card__players">{game.players}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
