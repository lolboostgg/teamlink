"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import { GameCover } from "@/components/home/GameCover";
import { AmbientGameBackground } from "@/components/home/AmbientGameBackground";

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
      <AmbientGameBackground slug={hoverSlug} />

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
        <div className="games-grid" onMouseLeave={() => setHoverSlug(null)}>
          {filtered.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="game-card"
              onMouseEnter={() => setHoverSlug(game.slug)}
            >
              <div className="game-card__cover">
                <GameCover game={game} iconMode />
              </div>
              <div className="game-card__name">{game.name}</div>
              <div className="game-card__meta">
                <span className="game-card__players">
                  <i className="fa-solid fa-user-group" aria-hidden="true" /> {game.players}
                </span>
                <span className="game-card__rating">
                  <i className="fa-solid fa-star" aria-hidden="true" /> 4.9
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
