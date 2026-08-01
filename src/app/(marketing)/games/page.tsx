import type { Metadata } from "next";
import { GAMES } from "@/lib/games";
import { GamesSearchGrid } from "@/components/home/GamesSearchGrid";

export const metadata: Metadata = {
  title: "All Games",
  description: "Book a teammate for any of our supported games.",
};

export default function GamesPage() {
  return (
    <main className="section games-page-hero">
      <div className="container">
        <div className="section__head section__head--center">
          <div className="section__eyebrow">All games</div>
          <h1 className="section__title">Choose your game</h1>
          <p className="section__sub">Pick a game to see available teammates, modes, and pricing.</p>
        </div>

        <GamesSearchGrid games={GAMES} />
      </div>
    </main>
  );
}
