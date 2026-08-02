import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import type { Teammate } from "@/lib/teammates";

interface Props {
  teammate: Teammate;
  isCenter: boolean;
  isFirstAccepted: boolean;
  isSelected: boolean;
  pickRank?: number;
  onSelect: () => void;
}

// Portrait-format card for a candidate who's actually accepted — the
// reused site placeholder avatar (/avatars/default.webp) stretched full-
// bleed as "portrait art" instead of a small circle, same asset already
// used everywhere else for teammate photos, just styled as cover art here.
export function TeammateCard({ teammate, isCenter, isFirstAccepted, isSelected, pickRank, onSelect }: Props) {
  const rank = teammate.lolRank ? getRankMeta(teammate.lolRank) : null;

  return (
    <button
      type="button"
      className={`pick-card${isCenter ? " pick-card--center" : ""}${isSelected ? " is-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${teammate.name}, ${teammate.rating.toFixed(1)} rating, ${isSelected ? "selected" : "select this teammate"}`}
    >
      {isCenter && (
        <span className="pick-card__auto-label">
          {isFirstAccepted ? "Auto select" : "Top pick"}
        </span>
      )}

      <span className="pick-card__art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/avatars/default.webp" alt="" />
      </span>

      <span className="pick-card__rating">
        <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} ({teammate.sessions})
      </span>

      {isSelected && (
        <span className="pick-card__check" aria-hidden="true">
          <i className="fa-solid fa-check" />
        </span>
      )}

      <span className="pick-card__body">
        {isFirstAccepted && isCenter && <span className="pick-card__hint">First to accept</span>}
        <span className="pick-card__flags">
          {teammate.languages.map((lang) => (
            <FlagIcon key={lang} iso={getLanguageMeta(lang).flagIso} label={getLanguageMeta(lang).label} />
          ))}
        </span>
        <span className="pick-card__name">{teammate.name}</span>
        <span className="pick-card__status">
          <span className="pick-card__status-dot" aria-hidden="true" /> Available
        </span>
        {rank && (
          <span className="pick-card__rank">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rank.icon} alt="" />
            {rank.label}+
          </span>
        )}
        <span className="pick-card__select-btn">
          {isSelected ? (
            <>
              <i className="fa-solid fa-check" aria-hidden="true" />
              {pickRank ? `Selected · Pick ${pickRank}` : "Selected"}
            </>
          ) : (
            "Select teammate"
          )}
        </span>
      </span>
    </button>
  );
}
