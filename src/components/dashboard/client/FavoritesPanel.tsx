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
    .map((id) => {
      const teammate = getTeammateById(id);
      if (!teammate) return null;
      const sessions = orders.filter((o) => o.selectedTeammateId === id && o.status === "completed").length;
      const gameName = getGameBySlug(teammate.gameSlugs[0])?.name ?? teammate.gameSlugs[0];
      return { id: teammate.id, name: teammate.name, gameName, rating: teammate.rating, sessions };
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
