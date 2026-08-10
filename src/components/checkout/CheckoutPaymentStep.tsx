"use client";

import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/payments";
import { PriceTag } from "@/components/currency/PriceTag";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Props {
  method: PaymentMethodKey;
  onMethodChange: (method: PaymentMethodKey) => void;
  totalEUR: number;
  submitting: boolean;
  onSubmit: () => void;
  // Credits only make sense for a signed-in account (guests have no
  // balance) — hidden entirely rather than shown disabled-and-confusing.
  creditsEnabled?: boolean;
  creditBalanceCents?: number | null;
}

// Picking how to pay. Card and PayPal both run through Stripe's hosted
// checkout, so no card details are ever typed into this page — submitting
// leaves for Stripe and the order is only dispatched once its webhook
// confirms the money. Credits are settled here against the Postgres balance.
// Crypto has no processor behind it and says so rather than pretending.
export function CheckoutPaymentStep({
  method,
  onMethodChange,
  totalEUR,
  submitting,
  onSubmit,
  creditsEnabled,
  creditBalanceCents,
}: Props) {
  const { p } = useLanguage();
  const visibleMethods = PAYMENT_METHODS.filter((pm) => pm.key !== "credits" || creditsEnabled);
  const balanceEUR = creditBalanceCents != null ? creditBalanceCents / 100 : null;
  const insufficientCredits = method === "credits" && balanceEUR !== null && balanceEUR < totalEUR;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (insufficientCredits || method === "crypto") return;
    onSubmit();
  }

  // What each method costs, said on the row itself so the three can be
  // compared without clicking through them one at a time.
  function feeBadge(pm: (typeof PAYMENT_METHODS)[number]) {
    if (pm.key === "crypto") return { text: p("Unavailable"), tone: "muted" as const };
    if (pm.feePercent === 0 && pm.feeFixedEUR === 0) return { text: p("No extra fee"), tone: "good" as const };
    return { text: `+${pm.feePercent}% + €${pm.feeFixedEUR.toFixed(2)}`, tone: "warn" as const };
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* One card of rows that open in place, rather than a row of tiles
          plus a second card repeating whichever tile was pressed — the two
          always said the same thing twice. */}
      <div className="checkout-card">
        <div className="checkout-card__title">{p("Payment method")}</div>

        <div className="pay-options" role="radiogroup" aria-label="Payment method">
          {visibleMethods.map((pm) => {
            const badge = feeBadge(pm);
            const isActive = method === pm.key;
            return (
              <div key={pm.key} className={`pay-option${isActive ? " is-selected" : ""}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className="pay-option__head"
                  onClick={() => onMethodChange(pm.key)}
                >
                  <span className="pay-option__radio" aria-hidden="true" />
                  <span className="pay-option__icon">
                    <i className={pm.icon} aria-hidden="true" />
                  </span>
                  <span className="pay-option__name">{p(pm.label)}</span>
                  <span className={`pay-option__badge pay-option__badge--${badge.tone}`}>{badge.text}</span>
                </button>

                {isActive && (
                  <div className="pay-option__body">
                    {pm.key === "card" && (
                      <p>
                        You&rsquo;ll be taken to Stripe&rsquo;s secure page to enter your card. We never see or store
                        the number — only the last four digits come back, so paying again later is one click.
                      </p>
                    )}

                    {pm.key === "paypal" && (
                      <p>
                        You&rsquo;ll be redirected to PayPal to approve the payment. It runs through Stripe, so it
                        lands on the same order as a card payment would.
                      </p>
                    )}

                    {pm.key === "crypto" && (
                      <p>
                        Not available yet — there&rsquo;s no crypto processor connected, so this would take an address
                        that nobody watches. Pay by card, PayPal or credits for now.
                      </p>
                    )}

                    {pm.key === "credits" && (
                      <p>
                        {p("Your balance:")}{" "}
                        {balanceEUR !== null ? (
                          <strong>
                            <PriceTag amountEUR={balanceEUR} />
                          </strong>
                        ) : (
                          "loading…"
                        )}
                      </p>
                    )}

                    {pm.key === "credits" && insufficientCredits && (
                      <p className="pay-option__warn pay-option__warn--danger">
                        <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> Not enough credits for this
                        total — top up or choose another payment method.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        className="btn btn--vivid btn--block"
        disabled={submitting || insufficientCredits || method === "crypto"}
      >
        {submitting ? p("Processing...") : <>{p("Pay")} <PriceTag amountEUR={totalEUR} /></>}
      </button>
    </form>
  );
}
