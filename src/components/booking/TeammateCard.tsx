import type { Teammate } from "@/lib/teammates";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta, championIcon } from "@/lib/lolAssets";

interface Props {
  teammate: Teammate;
  selected: boolean;
  onSelect: () => void;
}

export function TeammateCard({ teammate, selected, onSelect }: Props) {
  const rank = teammate.lolRank ? getRankMeta(teammate.lolRank) : null;

  return (
    <button type="button" className={`teammate-card${selected ? " is-selected" : ""}`} onClick={onSelect}>
      {selected && <i className="fa-solid fa-check teammate-card__check" aria-hidden="true" />}

      <div className="teammate-card__head">
        <span className="teammate-card__avatar">{teammate.avatarInitials}</span>
        <div>
          <div className="teammate-card__name">{teammate.name}</div>
          <div className="teammate-card__rating">
            <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} · {teammate.sessions} sessions
          </div>
        </div>
      </div>

      <p className="teammate-card__tagline">{teammate.tagline}</p>

      <div className="teammate-card__meta">
        <span>
          <i className="fa-solid fa-earth-europe" aria-hidden="true" /> {teammate.timezone}
        </span>
        <span className="teammate-card__langs">
          {teammate.languages.map((lang) => (
            <span key={lang} title={getLanguageMeta(lang).label}>
              {getLanguageMeta(lang).flag}
            </span>
          ))}
        </span>
      </div>

      {rank && (
        <div className="teammate-card__rank">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rank.icon} alt={rank.label} className="teammate-card__rank-icon" />
          <span>{rank.label}+</span>
        </div>
      )}

      {teammate.lolChampions && teammate.lolChampions.length > 0 && (
        <div className="teammate-card__champions">
          {teammate.lolChampions.map((champ) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={champ} src={championIcon(champ)} alt={champ} title={champ} className="teammate-card__champion-icon" />
          ))}
        </div>
      )}
    </button>
  );
}
