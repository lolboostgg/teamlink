import { PAYMENT_ICONS } from "@/lib/payments";

const TRUST_POINTS = [
  { icon: "fa-solid fa-lock", label: "Secure & encrypted", desc: "256-bit SSL on every order" },
  { icon: "fa-solid fa-shield-heart", label: "Money-back guarantee", desc: "Full refund if we can't match you" },
  { icon: "fa-solid fa-headset", label: "24/7 human support", desc: "Real people, no bots" },
];

// Reused on both checkout and the booking sidebar — the moment right
// before paying/booking is exactly where purchase anxiety peaks, so this
// is deliberately concrete (specific guarantees, not just a generic
// "secure" badge) rather than decorative.
export function TrustPoints() {
  return (
    <div className="trust-points">
      {TRUST_POINTS.map((point) => (
        <div key={point.label} className="trust-points__point">
          <span className="trust-points__icon">
            <i className={point.icon} aria-hidden="true" />
          </span>
          <div>
            <div className="trust-points__label">{point.label}</div>
            <div className="trust-points__desc">{point.desc}</div>
          </div>
        </div>
      ))}

      <div className="trust-points__payments">
        <span className="trust-points__payments-label">We accept</span>
        <div className="trust-points__payment-icons">
          {PAYMENT_ICONS.map((icon) => (
            <i key={icon} className={icon} aria-hidden="true" />
          ))}
        </div>
      </div>
    </div>
  );
}
