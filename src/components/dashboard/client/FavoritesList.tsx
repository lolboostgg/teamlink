"use client";

import Link from "next/link";
import { setFavorite } from "@/lib/favorites";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { GameMark } from "@/components/dashboard/GameMark";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";

export interface FavoriteTeammate {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarFocusX?: number | null;
  avatarFocusY?: number | null;
  avatarZoom?: number | null;
  tagline: string;
  languages: LanguageCode[];
  timezone: string;
  /** Every game they're listed for, not just the one you booked. */
  gameSlugs: string[];
  /** Where "Play again" goes — the game you actually played together. */
  playSlug: string;
  playGameName: string;
  rating: number;
  reviewCount: number;
  /** Completed orders between you and them. */
  sessions: number;
  /** Their platform-wide session count, for context on the rating. */
  totalSessions: number;
}

export function FavoritesList({ favorites }: { favorites: FavoriteTeammate[] }) {
  return (
    <div className="favorite-teammate-grid">
      {favorites.map((favorite) => (
        <article className="favorite-teammate-card" key={favorite.id}>
          {/* Unfavoriting is the same call the heart on Session Complete makes,
              so the list updates itself without a reload. */}
          <button
            type="button"
            className="favorite-teammate-card__remove"
            title={`Remove ${favorite.name} from favorites`}
            aria-label={`Remove ${favorite.name} from favorites`}
            onClick={() => void setFavorite(favorite.id, false)}
          >
            <i className="fa-solid fa-heart-crack" aria-hidden="true" />
          </button>

          <span className="favorite-teammate__avatar">
            <SafeAvatarImage src={favorite.avatarUrl} alt={`${favorite.name} profile`} frame={favorite} />
          </span>

          <div className="favorite-teammate-card__meta">
            <div className="favorite-teammate-card__name">{favorite.name}</div>
            {favorite.tagline && <p className="favorite-teammate-card__tagline">{favorite.tagline}</p>}

            <div className="favorite-teammate-card__facts">
              <span className="favorite-teammate-card__fact">
                <i className="fa-solid fa-gamepad" aria-hidden="true" />
                {favorite.sessions} session{favorite.sessions === 1 ? "" : "s"} together
              </span>
              {favorite.timezone && (
                <span className="favorite-teammate-card__fact">
                  <i className="fa-regular fa-clock" aria-hidden="true" />
                  {favorite.timezone}
                </span>
              )}
              {favorite.languages.length > 0 && (
                <span className="favorite-teammate-card__fact favorite-teammate-card__langs">
                  {favorite.languages.map((code) => {
                    const language = LANGUAGES.find((l) => l.code === code);
                    return language ? <FlagIcon key={code} iso={language.flagIso} label={language.label} /> : null;
                  })}
                </span>
              )}
            </div>

            {favorite.gameSlugs.length > 0 && (
              <div className="favorite-teammate-card__games">
                {/* GameMark already carries the name as a title attribute. */}
                {favorite.gameSlugs.map((slug) => (
                  <GameMark key={slug} slug={slug} size={20} />
                ))}
              </div>
            )}
          </div>

          <span className="favorite-teammate-card__rating">
            <i className="fa-solid fa-star" aria-hidden="true" /> {favorite.rating.toFixed(1)}
            {favorite.reviewCount > 0 && <small>{favorite.reviewCount} reviews</small>}
            {favorite.totalSessions > 0 && <small>{favorite.totalSessions} sessions total</small>}
          </span>

          <Link
            href={`/games/${favorite.playSlug}?teammate=${encodeURIComponent(favorite.id)}`}
            className="btn btn--vivid btn--sm favorite-teammate-card__play"
          >
            <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Play {favorite.playGameName} again
          </Link>
        </article>
      ))}
    </div>
  );
}
