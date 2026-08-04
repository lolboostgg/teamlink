"use client";

import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/payments";
import { PriceTag } from "@/components/currency/PriceTag";

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
  const active = PAYMENT_METHODS.find((m) => m.key === method) ?? PAYMENT_METHODS[0];
  const visibleMethods = PAYMENT_METHODS.filter((pm) => pm.key !== "credits" || creditsEnabled);
  const balanceEUR = creditBalanceCents != null ? creditBalanceCents / 100 : null;
  const insufficientCredits = method === "credits" && balanceEUR !== null && balanceEUR < totalEUR;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (insufficientCredits || method === "crypto") return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="checkout-card">
        <div className="checkout-card__title">Payment method</div>
        <div className="payment-methods">
          {visibleMethods.map((pm) => (
            <button
              key={pm.key}
              type="button"
              className={`payment-method${method === pm.key ? " is-selected" : ""}`}
              onClick={() => onMethodChange(pm.key)}
            >
              <i className={pm.icon} aria-hidden="true" />
              {pm.label}
            </button>
          ))}
        </div>
      </div>

      {method === "card" && (
        <div className="checkout-card">
          <div className="checkout-card__title">
            <i className="fa-brands fa-cc-stripe" aria-hidden="true" style={{ marginRight: 8 }} />
            Card
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            You&rsquo;ll be taken to Stripe&rsquo;s secure page to enter your card. We never see or store the number —
            only the last four digits come back, so paying again later is one click.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>{active.note}</p>
        </div>
      )}

      {method === "paypal" && (
        <div className="checkout-card">
          <div className="checkout-card__title">
            <i className="fa-brands fa-paypal" aria-hidden="true" style={{ marginRight: 8 }} />
            PayPal
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            You&rsquo;ll be redirected to PayPal to approve the payment. It runs through Stripe, so it lands on the
            same order as a card payment would.
          </p>
          <p style={{ fontSize: 12, color: "var(--warning)", marginTop: 8 }}>
            <i className="fa-solid fa-circle-info" aria-hidden="true" /> {active.note} (
            {active.feePercent}% + <PriceTag amountEUR={active.feeFixedEUR} />)
          </p>
        </div>
      )}

      {method === "crypto" && (
        <div className="checkout-card">
          <div className="checkout-card__title">
            <i className="fa-brands fa-bitcoin" aria-hidden="true" style={{ marginRight: 8 }} />
            Crypto
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Not available yet — there&rsquo;s no crypto processor connected, so this would take an address that
            nobody watches. Pay by card, PayPal or credits for now.
          </p>
        </div>
      )}

      {method === "credits" && (
        <div className="checkout-card">
          <div className="checkout-card__title">
            <i className="fa-solid fa-coins" aria-hidden="true" style={{ marginRight: 8 }} />
            TeamLink Credits
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Your balance:{" "}
            {balanceEUR !== null ? (
              <strong style={{ color: "var(--text)" }}>
                <PriceTag amountEUR={balanceEUR} />
              </strong>
            ) : (
              "loading..."
            )}
          </p>
          {insufficientCredits && (
            <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> Not enough credits for this total —
              top up or choose another payment method.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="btn btn--vivid btn--block"
        disabled={submitting || insufficientCredits || method === "crypto"}
      >
        {submitting ? "Processing..." : <>Pay <PriceTag amountEUR={totalEUR} /></>}
      </button>
    </form>
  );
}
