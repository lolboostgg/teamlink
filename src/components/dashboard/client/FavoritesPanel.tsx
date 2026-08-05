"use client";

import Link from "next/link";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { useFavoriteIds } from "@/lib/favorites";
import { getTeammateById } from "@/lib/teammates";
import { getGameBySlug } from "@/lib/games";
import { FavoritesList, type FavoriteTeammate } from "@/components/dashboard/client/FavoritesList";

// Real favorites (persisted from the "Mark as favorite" toggle on Session
// Complete) with a "sessions together" count computed from actual completed
// orders — nothing here is mock data.
export function FavoritesPanel() {
  const orders = useAllOrders();
  const favoriteIds = useFavoriteIds();

  const favorites: FavoriteTeammate[] = favoriteIds
    .map<FavoriteTeammate | null>((id) => {
      const teammate = getTeammateById(id);
      if (!teammate) return null;

      // Orders are newest first, so the first match is the last thing you
      // played together — a better target for "Play again" than whichever
      // game happens to sit first in their roster entry.
      const together = orders.filter((o) => o.selectedTeammateIds.includes(id) && o.status === "completed");
      const lastPlayed = together[0];
      const playSlug = lastPlayed?.gameSlug ?? teammate.gameSlugs[0] ?? "";
      const playGameName = lastPlayed?.gameName ?? getGameBySlug(playSlug)?.name ?? playSlug;

      return {
        id: teammate.id,
        name: teammate.name,
        avatarUrl: teammate.avatarUrl,
        avatarFocusX: teammate.avatarFocusX,
        avatarFocusY: teammate.avatarFocusY,
        avatarZoom: teammate.avatarZoom,
        tagline: teammate.tagline,
        languages: teammate.languages,
        timezone: teammate.timezone,
        gameSlugs: teammate.gameSlugs,
        playSlug,
        playGameName,
        rating: teammate.rating,
        reviewCount: teammate.reviewCount ?? 0,
        sessions: together.length,
        totalSessions: teammate.sessions,
      };
    })
    .filter((f): f is FavoriteTeammate => f !== null);

  if (favorites.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-heart-crack" aria-hidden="true" />
        <p>No favorites yet — mark a teammate as favorite after a session to see them here.</p>
        <Link href="/games" className="btn btn--vivid btn--sm">
          Book a teammate
        </Link>
      </div>
    );
  }

  return <FavoritesList favorites={favorites} />;
}
