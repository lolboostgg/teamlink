import type { Metadata } from "next";
import { FavoritesPanel } from "@/components/dashboard/client/FavoritesPanel";

export const metadata: Metadata = { title: "Favorites" };

export default function ClientFavoritesPage() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Favorite teammates</div>
          <div className="dashboard-panel__sub">Teammates you&rsquo;ve marked as favorites</div>
        </div>
      </div>
      <FavoritesPanel />
    </div>
  );
}
