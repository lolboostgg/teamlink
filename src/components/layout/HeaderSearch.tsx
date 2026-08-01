"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";

// Compact header search: click in, get a live preview of matching games
// right away (empty query shows the full roster), pick one to jump straight
// to its booking page. Replaces the old decorative (non-functional) input.
export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const results = (q ? GAMES.filter((g) => g.name.toLowerCase().includes(q)) : GAMES).slice(0, 6);

  function goTo(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/games/${slug}`);
  }

  return (
    <div className="site-header__search" ref={rootRef}>
      <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
      <input
        type="text"
        placeholder="Search games..."
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) goTo(results[0].slug);
        }}
      />

      {open && (
        <div className="header-search__preview">
          {results.length === 0 ? (
            <div className="header-search__empty">No games match &ldquo;{query}&rdquo;.</div>
          ) : (
            results.map((g) => (
              <button type="button" key={g.slug} className="header-search__item" onClick={() => goTo(g.slug)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gameIcon(g.slug)} alt="" className="header-search__item-icon" />
                <span className="header-search__item-name">{g.name}</span>
                <span className="header-search__item-players">{g.players}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
