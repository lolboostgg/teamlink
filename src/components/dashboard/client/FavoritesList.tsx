import Link from "next/link";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export interface FavoriteTeammate {
  id: string;
  name: string;
  avatarUrl?: string | null;
  gameName: string;
  gameSlug: string;
  rating: number;
  sessions: number;
}

export function FavoritesList({ favorites }: { favorites: FavoriteTeammate[] }) {
  return <div className="favorite-teammate-grid">
    {favorites.map((favorite) => <article className="favorite-teammate-card" key={favorite.id}>
      <span className="favorite-teammate__avatar"><SafeAvatarImage src={favorite.avatarUrl} alt={`${favorite.name} profile`} /></span>
      <div className="favorite-teammate-card__meta">
        <div className="favorite-teammate-card__name">{favorite.name}</div>
        <div className="favorite-teammate-card__game">{favorite.gameName}</div>
        <div className="favorite-teammate-card__sessions"><i className="fa-solid fa-gamepad" aria-hidden="true" /> {favorite.sessions} session{favorite.sessions === 1 ? "" : "s"} together</div>
      </div>
      <span className="favorite-teammate-card__rating"><i className="fa-solid fa-star" aria-hidden="true" /> {favorite.rating.toFixed(1)}</span>
      <Link href={`/games/${favorite.gameSlug}?teammate=${encodeURIComponent(favorite.id)}`} className="btn btn--vivid btn--sm favorite-teammate-card__play"><i className="fa-solid fa-rotate-right" aria-hidden="true" /> Play again</Link>
    </article>)}
  </div>;
}
