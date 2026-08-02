interface Props {
  isCenter?: boolean;
}

// Reserves a slot's space for a candidate who hasn't accepted (yet, or at
// all) — every one of the 5 slots stays visually "full" the whole time,
// nothing ever looks like an empty gap or a declined/rejected card.
export function SearchingCard({ isCenter }: Props) {
  return (
    <div className={`searching-card${isCenter ? " searching-card--center" : ""}`} aria-hidden="true">
      <span className="searching-card__spinner" />
      <span className="searching-card__title">Searching&hellip;</span>
      <span className="searching-card__sub">Waiting for another teammate</span>
    </div>
  );
}
