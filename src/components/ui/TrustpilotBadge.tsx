import { COMPANY, TRUSTPILOT } from "@/lib/company";

/**
 * The Trustpilot badge, in Trustpilot's own colours.
 *
 * Separate from TrustBadge, which counts the ratings left inside the product
 * (29 of them, and every one attached to a session). This one quotes the
 * public profile, and the whole point of it is that the reader can open that
 * profile from the badge and check — which is why the link is the badge and
 * not a footnote under it.
 *
 * The green is Trustpilot's, not ours. It is the only thing on the page
 * allowed to use it, because it is the only thing referring to them.
 */
export function TrustpilotBadge({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`tp-badge${compact ? " tp-badge--compact" : ""}`}
      href={COMPANY.trustpilot}
      target="_blank"
      rel="noreferrer noopener"
    >
      <span className="tp-badge__stars" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span className="tp-badge__star" key={i}>
            <i className="fa-solid fa-star" />
          </span>
        ))}
      </span>
      <span className="tp-badge__score">
        {TRUSTPILOT.score.toFixed(1)} <span>out of 5</span>
      </span>
      <span className="tp-badge__sep" aria-hidden="true" />
      <span className="tp-badge__source">
        <i className="fa-solid fa-star" aria-hidden="true" />
        <span>
          {TRUSTPILOT.reviews} reviews on <b>Trustpilot</b>
        </span>
      </span>
    </a>
  );
}
