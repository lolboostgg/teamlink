import type { Review } from "@/lib/dashboard/teammateData";

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <div className="dashboard-list">
      {reviews.map((r) => (
        <div className="dashboard-list-item" key={r.id}>
          <div className="dashboard-list-item__meta">
            <div className="dashboard-list-item__title">{r.client}</div>
            <div className="dashboard-list-item__sub">&ldquo;{r.comment}&rdquo; — {r.date}</div>
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
