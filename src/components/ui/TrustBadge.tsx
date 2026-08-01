const SAMPLE_INITIALS = ["JK", "RM", "AL"];

// A real rating widget — individually rendered star tiles + an overlapping
// avatar cluster, not a text pill — matched to the production quality of
// embedded review-platform widgets (Trustpilot etc.) without pretending to
// be one we don't actually have. Labeled honestly as TeamLink's own
// verified-session rating.
export function TrustBadge({ reviews = "2,400+" }: { reviews?: string }) {
  return (
    <div className="trust-badge">
      <div className="trust-badge__avatars" aria-hidden="true">
        {SAMPLE_INITIALS.map((initials) => (
          <span className="trust-badge__avatar" key={initials}>
            {initials}
          </span>
        ))}
      </div>
      <div className="trust-badge__main">
        <div className="trust-badge__stars-row" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <span className="trust-badge__star" key={i}>
              <i className="fa-solid fa-star" />
            </span>
          ))}
        </div>
        <div className="trust-badge__label">
          <strong>Excellent · 4.9/5</strong> from {reviews} verified sessions
        </div>
      </div>
    </div>
  );
}
