import type { Metadata } from "next";
import { GAMES } from "@/lib/games";
import { GamesSearchGrid } from "@/components/home/GamesSearchGrid";
import { onlineTeammatesByGame } from "@/lib/gameAvailability";
import { priceFromEUR, modeCount } from "@/lib/bookingOptions";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "All Games",
  description: "Every game you can book a verified QUP.gg teammate for, with live availability and the price each one starts at.",
  path: "/games",
});

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
