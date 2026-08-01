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
      <GamesSearchGrid games={GAMES} />
    </main>
  );
}
