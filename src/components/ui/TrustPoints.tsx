import { PAYMENT_ICONS, PAYMENT_LOGOS } from "@/lib/payments";

const TRUST_POINTS = [
  { icon: "fa-solid fa-lock", label: "Secure & encrypted", desc: "256-bit SSL on every order" },
  { icon: "fa-solid fa-shield-heart", label: "Money-back guarantee", desc: "Full refund if we can't match you" },
  { icon: "fa-solid fa-headset", label: "24/7 human support", desc: "Real people, no bots" },
];

interface Props {
  /** One slim icon row instead of three stacked description rows — used
   * where the full version reads as too tall (e.g. the booking sidebar). */
  compact?: boolean;
}

// Reused on both checkout and the booking sidebar — the moment right
// before paying/booking is exactly where purchase anxiety peaks, so this
// is deliberately concrete (specific guarantees, not just a generic
// "secure" badge) rather than decorative.
export function TrustPoints({ compact = false }: Props) {
  return (
    <div className={`trust-points${compact ? " trust-points--compact" : ""}`}>
      {compact ? (
        <div className="trust-points__row">
          {TRUST_POINTS.map((point) => (
            <div key={point.label} className="trust-points__row-item" title={point.desc}>
              <span className="trust-points__icon">
                <i className={point.icon} aria-hidden="true" />
              </span>
              <span className="trust-points__row-label">{point.label}</span>
            </div>
          ))}
        </div>
      ) : (
        TRUST_POINTS.map((point) => (
          <div key={point.label} className="trust-points__point">
            <span className="trust-points__icon">
              <i className={point.icon} aria-hidden="true" />
            </span>
            <div>
              <div className="trust-points__label">{point.label}</div>
              <div className="trust-points__desc">{point.desc}</div>
            </div>
          </div>
        ))
      )}

      <div className="trust-points__payments">
        <span className="trust-points__payments-label">We accept</span>
        {compact ? (
          <div className="trust-points__payment-logos">
            {PAYMENT_LOGOS.map((logo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={logo.src} src={logo.src} alt={logo.label} title={logo.label} />
            ))}
          </div>
        ) : (
          <div className="trust-points__payment-icons">
            {PAYMENT_ICONS.map((icon) => (
              <i key={icon} className={icon} aria-hidden="true" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
