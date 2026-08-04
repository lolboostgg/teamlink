import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export interface FavoriteTeammate {
  id: string;
  name: string;
  avatarUrl?: string | null;
  gameName: string;
  rating: number;
  sessions: number;
}

export function FavoritesList({ favorites }: { favorites: FavoriteTeammate[] }) {
  return (
    <div className="dashboard-list">
      {favorites.map((f) => (
        <div className="dashboard-list-item" key={f.id}>
          <span className="favorite-teammate__avatar">
            <SafeAvatarImage src={f.avatarUrl} alt={`${f.name} profile`} />
          </span>
          <div className="dashboard-list-item__meta">
            <div className="dashboard-list-item__title">{f.name}</div>
            <div className="dashboard-list-item__sub">{f.gameName} · {f.sessions} session{f.sessions === 1 ? "" : "s"} together</div>
          </div>
          <span className="dashboard-list-item__stars">
            <i className="fa-solid fa-star" aria-hidden="true" /> {f.rating.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
