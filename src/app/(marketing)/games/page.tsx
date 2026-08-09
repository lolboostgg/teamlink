import type { Metadata } from "next";
import { GAMES } from "@/lib/games";
import { GamesSearchGrid } from "@/components/home/GamesSearchGrid";
import { onlineTeammatesByGame } from "@/lib/gameAvailability";
import { priceFromEUR, modeCount } from "@/lib/bookingOptions";

export const metadata: Metadata = {
  title: "All Games",
  description: "Book a teammate for any of our supported games.",
};

// Cached and refreshed on a minute, not rendered per visitor: the online
// count is the only live thing on the page and nobody browsing a catalogue
// needs it to the second. A fully dynamic page would put a roster query in
// front of every visit for a number that barely moves.
export const revalidate = 60;

export default async function GamesPage() {
  const online = await onlineTeammatesByGame();

  const games = GAMES.map((game) => ({
    ...game,
    online: online[game.slug] ?? 0,
    priceFromEUR: priceFromEUR(game.slug),
    modes: modeCount(game.slug),
  }));

  return (
    <main className="section games-page-hero">
      <GamesSearchGrid games={games} />
    </main>
  );
}
