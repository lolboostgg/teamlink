import { PAYMENT_ICONS } from "@/lib/payments";

const TRUST_POINTS = [
  { icon: "fa-solid fa-lock", label: "Secure & encrypted", desc: "256-bit SSL on every order" },
  { icon: "fa-solid fa-shield-heart", label: "Money-back guarantee", desc: "Full refund if we can't match you" },
  { icon: "fa-solid fa-headset", label: "24/7 human support", desc: "Real people, no bots" },
];

// Sits below the order summary — the moment right before paying is exactly
// where purchase anxiety peaks, so this is deliberately concrete (specific
// guarantees, not just a generic "secure" badge) rather than decorative.
export function CheckoutTrust() {
  return (
    <div className="checkout-card checkout-trust">
      {TRUST_POINTS.map((point) => (
        <div key={point.label} className="checkout-trust__point">
          <span className="checkout-trust__icon">
            <i className={point.icon} aria-hidden="true" />
          </span>
          <div>
            <div className="checkout-trust__label">{point.label}</div>
            <div className="checkout-trust__desc">{point.desc}</div>
          </div>
        </div>
      ))}

      <div className="checkout-trust__payments">
        <span className="checkout-trust__payments-label">We accept</span>
        <div className="checkout-trust__payment-icons">
          {PAYMENT_ICONS.map((icon) => (
            <i key={icon} className={icon} aria-hidden="true" />
          ))}
        </div>
      </div>
    </div>
  );
}
