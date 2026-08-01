// Colored rating pill, modeled after tapin.gg's green "Excellent ·
// Trustpilot" badge — reads as a real trust signal, not just plain text.
export function TrustBadge({ reviews = "2,400+" }: { reviews?: string }) {
  return (
    <div className="trust-badge">
      <span className="trust-badge__score">4.9</span>
      <span className="trust-badge__stars">★★★★★</span>
      <span className="trust-badge__label">
        Excellent <strong>{reviews} reviews</strong>
      </span>
    </div>
  );
}
