"use client";

import { useMemo, useState } from "react";
import { GamesFullGrid, type GameListing } from "@/components/home/GamesFullGrid";
import { useLanguage } from "@/components/language/LanguageProvider";

export function GamesSearchGrid({ games }: { games: GameListing[] }) {
  const { p } = useLanguage();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q) || g.shortName.toLowerCase().includes(q));
  }, [games, query]);

  // One number for the whole page, above the grid: somebody who lands here
  // wants to know there is anybody to play with at all before they start
  // comparing games, and eight separate counts don't answer that.
  const totalOnline = useMemo(() => games.reduce((sum, g) => sum + g.online, 0), [games]);

  return (
    <div className="container">
      <div className="section__head section__head--center">
        <div className="section__eyebrow">{p("All games")}</div>
        <h1 className="section__title">{p("Choose your game")}</h1>
        <p className="section__sub">{p("Pick a game to see available teammates, modes, and pricing.")}</p>
        {totalOnline > 0 && (
          <p className="games-page-live">
            <span className="games-page-live__dot" aria-hidden="true" />
            {totalOnline} {totalOnline === 1 ? p("teammate online right now") : p("teammates online right now")}
          </p>
        )}
      </div>

      <div className="games-page-search">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input
          type="text"
          placeholder={p("Search games...")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="games-page-empty">{p("No games match")} &ldquo;{query}&rdquo;.</p>
      ) : (
        <GamesFullGrid games={filtered} />
      )}
    </div>
  );
}
