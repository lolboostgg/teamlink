import { getTeammateById } from "@/lib/teammates";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import type { DispatchCandidate } from "@/lib/matchmaking/types";

interface Props {
  candidate: DispatchCandidate;
  isFirstAccepted: boolean;
  isSelected: boolean;
  selectable: boolean;
  onSelect: () => void;
}

export function CandidateSlot({ candidate, isFirstAccepted, isSelected, selectable, onSelect }: Props) {
  const teammate = getTeammateById(candidate.teammateId);
  if (!teammate) return null;

  if (candidate.status === "pending") {
    return (
      <div className="candidate-slot candidate-slot--pending">
        <span className="candidate-slot__avatar candidate-slot__avatar--pending">{teammate.avatarInitials}</span>
        <span className="candidate-slot__name">{teammate.name}</span>
        <span className="candidate-slot__status">
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> Waiting for response...
        </span>
      </div>
    );
  }

  if (candidate.status === "declined" || candidate.status === "timed_out") {
    return (
      <div className="candidate-slot candidate-slot--out">
        <span className="candidate-slot__avatar">{teammate.avatarInitials}</span>
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
      className={`candidate-slot candidate-slot--accepted${isSelected ? " is-selected" : ""}${!selectable ? " is-static" : ""}`}
      onClick={selectable ? onSelect : undefined}
      disabled={!selectable}
    >
      {isFirstAccepted && !isSelected && <span className="candidate-slot__badge">First to accept</span>}
      {isSelected && <span className="candidate-slot__badge candidate-slot__badge--selected">Selected</span>}
      <span className="candidate-slot__avatar">{teammate.avatarInitials}</span>
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
            <span key={lang} title={getLanguageMeta(lang).label}>
              {getLanguageMeta(lang).flag}
            </span>
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
