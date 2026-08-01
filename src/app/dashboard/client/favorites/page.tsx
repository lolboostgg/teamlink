import type { Metadata } from "next";
import { FavoritesList } from "@/components/dashboard/client/FavoritesList";
import { CLIENT_FAVORITES } from "@/lib/dashboard/clientData";

export const metadata: Metadata = { title: "Favorites" };

export default function ClientFavoritesPage() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Favorite teammates</div>
          <div className="dashboard-panel__sub">Players you&rsquo;ve booked with more than once</div>
        </div>
      </div>
      <FavoritesList favorites={CLIENT_FAVORITES} />
    </div>
  );
}
