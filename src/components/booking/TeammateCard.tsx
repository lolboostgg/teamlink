import type { Teammate } from "@/lib/teammates";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { heroCardBackground } from "@/lib/gameArt";

interface Props {
  teammate: Teammate;
  gameSlug: string;
  selected: boolean;
  onSelect: () => void;
}

// Booster-search-style card (key art banner + overlapping avatar + rating +
// rank + flags) instead of a flat info card — matches the richer profile
// card pattern from the reference the user pointed to (eloboost.gg).
export function TeammateCard({ teammate, gameSlug, selected, onSelect }: Props) {
  const rank = teammate.lolRank ? getRankMeta(teammate.lolRank) : null;

  return (
    <button type="button" className={`teammate-card${selected ? " is-selected" : ""}`} onClick={onSelect}>
      <div className="teammate-card__banner" style={{ backgroundImage: `url(${heroCardBackground(gameSlug)})` }}>
        <span className="teammate-card__banner-scrim" aria-hidden="true" />
        {selected && <i className="fa-solid fa-check teammate-card__check" aria-hidden="true" />}
      </div>

      <div className="teammate-card__body">
        <span className="teammate-card__avatar">
          <AvatarIcon seed={teammate.id} />
        </span>

        <div className="teammate-card__head">
          <span className="teammate-card__name">{teammate.name}</span>
          <span className="teammate-card__rating">
            <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)}
          </span>
        </div>

        {rank && (
          <span className="teammate-card__rank">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rank.icon} alt="" className="teammate-card__rank-icon" />
            {rank.label}+
          </span>
        )}

        <p className="teammate-card__tagline">{teammate.tagline}</p>

        <div className="teammate-card__footer">
          <span className="teammate-card__langs">
            {teammate.languages.map((lang) => (
              <FlagIcon key={lang} iso={getLanguageMeta(lang).flagIso} label={getLanguageMeta(lang).label} />
            ))}
          </span>
          <span className="teammate-card__arrow" aria-hidden="true">
            <i className="fa-solid fa-arrow-right" />
          </span>
        </div>
      </div>
    </button>
  );
}
