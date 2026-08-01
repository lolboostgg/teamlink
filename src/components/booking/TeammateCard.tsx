import type { Teammate } from "@/lib/teammates";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { AvatarIcon } from "@/components/ui/AvatarIcon";

interface Props {
  teammate: Teammate;
  selected: boolean;
  onSelect: () => void;
}

export function TeammateCard({ teammate, selected, onSelect }: Props) {
  const rank = teammate.lolRank ? getRankMeta(teammate.lolRank) : null;

  return (
    <button type="button" className={`teammate-chip${selected ? " is-selected" : ""}`} onClick={onSelect}>
      {selected && <i className="fa-solid fa-check teammate-chip__check" aria-hidden="true" />}

      <span className="teammate-chip__avatar">
        <AvatarIcon seed={teammate.id} />
      </span>
      <span className="teammate-chip__name">{teammate.name}</span>
      <span className="teammate-chip__rating">
        <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} · {teammate.sessions}
      </span>
      <span className="teammate-chip__tagline">{teammate.tagline}</span>

      {rank && (
        <span className="teammate-chip__rank">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rank.icon} alt="" className="teammate-chip__rank-icon" />
          {rank.label}+
        </span>
      )}

      <span className="teammate-chip__langs">
        {teammate.languages.map((lang) => (
          <FlagIcon key={lang} iso={getLanguageMeta(lang).flagIso} label={getLanguageMeta(lang).label} />
        ))}
      </span>
    </button>
  );
}
