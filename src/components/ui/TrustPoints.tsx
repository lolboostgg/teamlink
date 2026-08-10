"use client";

import { PAYMENT_ICONS } from "@/lib/payments";
import { useLanguage } from "@/components/language/LanguageProvider";
import { getBookingCopy } from "@/lib/bookingLocale";

const TRUST_POINTS = [
  { icon: "fa-solid fa-lock", label: "Secure & encrypted", desc: "256-bit SSL on every order" },
  { icon: "fa-solid fa-shield-heart", label: "Money-back guarantee", desc: "Full refund if we can't match you" },
  { icon: "fa-solid fa-headset", label: "24/7 human support", desc: "Real people, no bots" },
];

interface Props {
  /** One slim icon row instead of three stacked description rows — used
   * where the full version reads as too tall (e.g. the booking sidebar). */
  compact?: boolean;
  /** The booking sidebar splits the two halves apart: trust rows scroll
   * with the card body while the payment band rides along in the sticky
   * footer, so it renders <PaymentStrip /> separately. */
  payments?: boolean;
}

/** The payment band on its own, for layouts that place it away from the
 * trust rows. Carries the same classes so it keeps the card-footer bleed. */
export function PaymentStrip() {
  return (
    <div className="trust-points__payments trust-points__payments--bare">
      <div className="trust-points__payment-icons">
        {PAYMENT_ICONS.map((icon) => (
          <i key={icon} className={icon} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}

// Reused on both checkout and the booking sidebar — the moment right
// before paying/booking is exactly where purchase anxiety peaks, so this
// is deliberately concrete (specific guarantees, not just a generic
// "secure" badge) rather than decorative.
export function TrustPoints({ compact = false, payments = true }: Props) {
  const { language } = useLanguage();
  const labels = getBookingCopy(language);
  const points = TRUST_POINTS.map((point, index) => ({
    ...point,
    label: [labels.secure, labels.guarantee, labels.support][index],
  }));
  return (
    <div className={`trust-points${compact ? " trust-points--compact" : ""}`}>
      {compact ? (
        <div className="trust-points__row">
          {points.map((point) => (
            <div key={point.label} className="trust-points__row-item" title={point.desc}>
              <span className="trust-points__icon">
                <i className={point.icon} aria-hidden="true" />
              </span>
              <span className="trust-points__row-label">{point.label}</span>
            </div>
          ))}
        </div>
      ) : (
        points.map((point) => (
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

      {payments && (
        <div className="trust-points__payments">
          {!compact && <span className="trust-points__payments-label">We accept</span>}
          <div className="trust-points__payment-icons">
            {PAYMENT_ICONS.map((icon) => (
              <i key={icon} className={icon} aria-hidden="true" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
