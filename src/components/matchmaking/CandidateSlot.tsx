import { getTeammateById } from "@/lib/teammates";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import type { DispatchCandidate } from "@/lib/matchmaking/types";

interface Props {
  candidate: DispatchCandidate;
  isFirstAccepted: boolean;
  isSelected: boolean;
  selectable: boolean;
  onSelect: () => void;
  /** "lg" for the center/priority slot in the candidate stage — bigger avatar and type. */
  size?: "sm" | "lg";
  /** Multi-pick mode (order.teammates > 1) — which slot this pick fills, e.g. "2" of "2/4". */
  pickRank?: number;
}

export function CandidateSlot({ candidate, isFirstAccepted, isSelected, selectable, onSelect, size = "sm", pickRank }: Props) {
  const teammate = getTeammateById(candidate.teammateId);
  if (!teammate) return null;
  const sizeClass = size === "lg" ? " candidate-slot--lg" : "";

  if (candidate.status === "pending") {
    return (
      <div className={`candidate-slot candidate-slot--pending${sizeClass}`}>
        <span className="candidate-slot__avatar candidate-slot__avatar--pending">
          <AvatarIcon seed={teammate.id} />
        </span>
        <span className="candidate-slot__name">{teammate.name}</span>
        <span className="candidate-slot__status">
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> Waiting for response...
        </span>
      </div>
    );
  }

  if (candidate.status === "declined" || candidate.status === "timed_out") {
    return (
      <div className={`candidate-slot candidate-slot--out${sizeClass}`}>
        <span className="candidate-slot__avatar">
          <AvatarIcon seed={teammate.id} />
        </span>
        <span className="candidate-slot__name">{teammate.name}</span>
        <span className="candidate-slot__status">
          {candidate.status === "declined" ? "Declined" : "No response"}
        </span>
      </div>
    );
  }

  const rank = teammate.lolRank ? getRankMeta(teammate.lolRank) : null;

  return (
    <button
      type="button"
      className={`candidate-slot candidate-slot--accepted${sizeClass}${isSelected ? " is-selected" : ""}${!selectable ? " is-static" : ""}`}
      onClick={selectable ? onSelect : undefined}
      disabled={!selectable}
    >
      {isFirstAccepted && !isSelected && <span className="candidate-slot__badge">First to accept</span>}
      {isSelected && (
        <span className="candidate-slot__badge candidate-slot__badge--selected">
          {pickRank ? `Pick ${pickRank}` : "Selected"}
        </span>
      )}
      <span className="candidate-slot__avatar">
        <AvatarIcon seed={teammate.id} />
      </span>
      <span className="candidate-slot__name">{teammate.name}</span>
      <span className="candidate-slot__rating">
        <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} · {teammate.sessions} sessions
      </span>
      <p className="candidate-slot__tagline">{teammate.tagline}</p>
      <div className="candidate-slot__meta">
        <span>
          <i className="fa-solid fa-earth-europe" aria-hidden="true" /> {teammate.timezone}
        </span>
        <span className="candidate-slot__langs">
          {teammate.languages.map((lang) => (
            <FlagIcon key={lang} iso={getLanguageMeta(lang).flagIso} label={getLanguageMeta(lang).label} />
          ))}
        </span>
      </div>
      {rank && (
        <div className="candidate-slot__rank">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rank.icon} alt={rank.label} className="candidate-slot__rank-icon" />
          <span>{rank.label}+</span>
        </div>
      )}
    </button>
  );
}
