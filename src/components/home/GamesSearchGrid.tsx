"use client";

import { useMemo, useState } from "react";
import type { Game } from "@/lib/games";
import { AmbientGameBackground } from "@/components/home/AmbientGameBackground";
import { GamesFullGrid } from "@/components/home/GamesFullGrid";

export function GamesSearchGrid({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q) || g.shortName.toLowerCase().includes(q));
  }, [games, query]);

  return (
    <>
      {/* Sibling of .container (not nested inside it) so it resolves against
          the full-width .games-page-hero section instead of the
          max-width-constrained container — otherwise it renders as a
          boxed-in rectangle instead of a full-bleed backdrop. */}
      <AmbientGameBackground slug={hoverSlug} />

      <div className="container">
        <div className="section__head section__head--center">
          <div className="section__eyebrow">All games</div>
          <h1 className="section__title">Choose your game</h1>
          <p className="section__sub">Pick a game to see available teammates, modes, and pricing.</p>
        </div>

        <div className="games-page-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search games..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="games-page-empty">No games match &ldquo;{query}&rdquo;.</p>
        ) : (
          <GamesFullGrid games={filtered} onHover={setHoverSlug} />
        )}
      </div>
    </>
  );
}
