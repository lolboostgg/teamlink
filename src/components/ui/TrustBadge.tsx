// A real rating widget — a row of individually-rendered star tiles plus a
// bold score, matched to the production quality of embedded review-platform
// widgets (Trustpilot etc.) without pretending to be one we don't actually
// have. Honestly labeled as QUP.gg's own verified-session rating.
export function TrustBadge({ reviews = "2,400+" }: { reviews?: string }) {
  return (
    <div className="trust-badge">
      <div className="trust-badge__stars" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span className="trust-badge__star" key={i}>
            <i className="fa-solid fa-star" />
          </span>
        ))}
      </div>
      <span className="trust-badge__score">
        4.9 <span>out of 5</span>
      </span>
      <span className="trust-badge__source">
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        <span>Verified Reviews · {reviews}</span>
      </span>
    </div>
  );
}
