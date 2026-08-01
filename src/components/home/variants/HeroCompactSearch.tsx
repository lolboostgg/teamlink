"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import { Reveal } from "@/components/ui/Reveal";
import { TrustBadge } from "@/components/ui/TrustBadge";

// Compact, search-first hero — closer to eloboost.gg's minimal hero than
// to a full-bleed image. The primary affordance is the search bar, not a
// visual game picker.
export function HeroCompactSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return GAMES.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  return (
    <section className="hero-compact section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 480, height: 300, left: "50%", top: "-40px", transform: "translateX(-50%)" }} aria-hidden="true" />
      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <div className="hero-compact__pills">
            <span>Boosting</span>
            <span>Game Buddy</span>
            <span>Coaching</span>
            <span>Account Trading</span>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <h1 className="hero-compact__title">
            Built different. <span className="hero__title-accent">Beyond gaming services.</span>
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <div className="hero-compact__search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search games or services..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results.length > 0 && (
              <div className="hero-compact__results">
                {results.map((g) => (
                  <Link key={g.slug} href={`/games/${g.slug}`}>
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="hero-compact__stats">
            <TrustBadge />
            <span className="hero-compact__dot" />
            <span><strong>{GAMES.length}+</strong> games</span>
            <span className="hero-compact__dot" />
            <span><strong>2,400+</strong> sessions played</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
