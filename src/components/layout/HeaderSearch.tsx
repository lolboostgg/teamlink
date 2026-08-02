"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES } from "@/lib/games";

// Compact header search — type a game name and press Enter to jump to its
// booking page. No live-results dropdown (removed per feedback).
export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = GAMES.find((g) => g.name.toLowerCase().includes(q));
    if (match) router.push(`/games/${match.slug}`);
  }

  return (
    <div className="site-header__search">
      <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
      <input
        type="text"
        placeholder="Search games..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />
    </div>
  );
}
