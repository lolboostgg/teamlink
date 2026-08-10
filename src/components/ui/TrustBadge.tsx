/**
 * The rating widget in the hero and at checkout.
 *
 * It used to be a hardcoded "4.9 out of 5 · Verified Reviews · 2,400+" while
 * the database held twenty-nine ratings. Both numbers are read now — passed
 * in by the page, which has them server-side, so they render with the first
 * paint instead of appearing and then correcting themselves.
 *
 * Given nothing, it shows the stars and the label and no figures, which is
 * the honest state for a page that could not read them.
 */
export function TrustBadge({ score, reviews }: { score?: number | null; reviews?: number | null }) {
  const hasScore = typeof score === "number" && score > 0;
  const rounded = hasScore ? Math.round(score) : 5;

  return (
    <div className="trust-badge">
      <div className="trust-badge__stars" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span className={`trust-badge__star${i < rounded ? "" : " is-empty"}`} key={i}>
            <i className="fa-solid fa-star" />
          </span>
        ))}
      </div>
      {hasScore && (
        <span className="trust-badge__score">
          {score.toFixed(2).replace(/0$/, "")} <span>out of 5</span>
        </span>
      )}
      <span className="trust-badge__source">
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        {/* "Rated sessions", not "reviews": every one was left by the person
            who booked that session, and saying so is the whole claim. */}
        <span>
          {typeof reviews === "number" && reviews > 0
            ? `${reviews} rated ${reviews === 1 ? "session" : "sessions"}`
            : "Rated after every session"}
        </span>
      </span>
    </div>
  );
}
