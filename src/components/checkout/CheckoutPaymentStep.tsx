"use client";

import { useState } from "react";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/payments";
import { PriceTag } from "@/components/currency/PriceTag";

const CRYPTO_OPTIONS = [
  { key: "btc", label: "BTC", icon: "fa-brands fa-bitcoin" },
  { key: "eth", label: "ETH", icon: "fa-brands fa-ethereum" },
  { key: "usdt", label: "USDT", icon: "fa-solid fa-dollar-sign" },
];

interface Props {
  method: PaymentMethodKey;
  onMethodChange: (method: PaymentMethodKey) => void;
  totalEUR: number;
  submitting: boolean;
  onSubmit: () => void;
}

// Mock payment placeholders only — Card is branded as Stripe (no live SDK,
// this project has no backend to hold API keys), PayPal/Crypto surface a
// visible processing fee that flows into the order summary via
// lib/payments.ts's calculateFee. Submitting just simulates success, same
// pattern as the rest of this mock-data-first project.
export function CheckoutPaymentStep({ method, onMethodChange, totalEUR, submitting, onSubmit }: Props) {
  const [crypto, setCrypto] = useState("btc");
  const active = PAYMENT_METHODS.find((m) => m.key === method) ?? PAYMENT_METHODS[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="checkout-card">
        <div className="checkout-card__title">Payment method</div>
        <div className="payment-methods">
          {PAYMENT_METHODS.map((pm) => (
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
            Card details
          </div>
          <div className="form-row">
            <label htmlFor="cc-number">Card number</label>
            <input id="cc-number" type="text" placeholder="1234 1234 1234 1234" required />
          </div>
          <div className="form-row-grid">
            <div className="form-row">
              <label htmlFor="cc-expiry">Expiry</label>
              <input id="cc-expiry" type="text" placeholder="MM/YY" required />
            </div>
            <div className="form-row">
              <label htmlFor="cc-cvc">CVC</label>
              <input id="cc-cvc" type="text" placeholder="123" required />
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="cc-name">Name on card</label>
            <input id="cc-name" type="text" placeholder="Jane Doe" required />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
            Processed securely via Stripe. {active.note}
          </p>
        </div>
      )}

      {method === "paypal" && (
        <div className="checkout-card">
          <div className="checkout-card__title">
            <i className="fa-brands fa-paypal" aria-hidden="true" style={{ marginRight: 8 }} />
            PayPal
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
            You&rsquo;ll be redirected to PayPal to complete payment after clicking below.
          </p>
          <p style={{ fontSize: 12, color: "var(--warning)" }}>
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
          <div className="payment-methods" style={{ marginBottom: 14 }}>
            {CRYPTO_OPTIONS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`payment-method${crypto === c.key ? " is-selected" : ""}`}
                onClick={() => setCrypto(c.key)}
              >
                <i className={c.icon} aria-hidden="true" />
                {c.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
            You&rsquo;ll receive a payment address after clicking below.
          </p>
          <p style={{ fontSize: 12, color: "var(--warning)" }}>
            <i className="fa-solid fa-circle-info" aria-hidden="true" /> {active.note} ({active.feePercent}%)
          </p>
        </div>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? "Processing..." : <>Pay <PriceTag amountEUR={totalEUR} /></>}
      </button>
    </form>
  );
}
