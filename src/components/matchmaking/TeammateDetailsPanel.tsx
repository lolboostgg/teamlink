import type { Teammate } from "@/lib/teammates";

interface Props {
  teammate: Teammate | null;
}

// Sits under each card, same width, so the row keeps a steady grid — real
// info when a teammate's there, a skeleton shimmer otherwise. Only shows
// fields the teammate roster actually has data for (no invented win rate).
export function TeammateDetailsPanel({ teammate }: Props) {
  if (!teammate) {
    return (
      <div className="teammate-details teammate-details--skeleton" aria-hidden="true">
        <span className="teammate-details__skeleton-line" style={{ width: "60%" }} />
        <span className="teammate-details__skeleton-line" style={{ width: "85%" }} />
        <span className="teammate-details__skeleton-line" style={{ width: "70%" }} />
      </div>
    );
  }

  const champions = teammate.lolChampions ?? [];

  return (
    <div className="teammate-details">
      {champions.length > 0 ? (
        <>
          <span className="teammate-details__label">Top champions</span>
          <ul className="teammate-details__list">
            {champions.slice(0, 3).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <span className="teammate-details__label">About</span>
          <p className="teammate-details__tagline">{teammate.tagline}</p>
        </>
      )}
      <span className="teammate-details__meta">
        <i className="fa-solid fa-earth-europe" aria-hidden="true" /> {teammate.timezone}
      </span>
    </div>
  );
}
