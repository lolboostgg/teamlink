export interface DisplayReview {
  id: string;
  client: string;
  gameName: string;
  rating: number;
  date: string;
}

// No free-text comment field exists in the real review data (the rating
// control on Session Complete is stars-only) — showing which game/client
// it was for instead of a fabricated quote.
export function ReviewsList({ reviews }: { reviews: DisplayReview[] }) {
  return (
    <div className="dashboard-list">
      {reviews.map((r) => (
        <div className="dashboard-list-item" key={r.id}>
          <div className="dashboard-list-item__meta">
            <div className="dashboard-list-item__title">{r.client}</div>
            <div className="dashboard-list-item__sub">
              {r.gameName} · {r.date}
            </div>
          </div>
          <span className="dashboard-list-item__stars">
            {"★".repeat(r.rating)}
            <em style={{ color: "var(--text-faint)", fontStyle: "normal" }}>{"★".repeat(5 - r.rating)}</em>
          </span>
        </div>
      ))}
    </div>
  );
}
