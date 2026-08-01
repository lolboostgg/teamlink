"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PAYMENT_METHODS = [
  { key: "card", icon: "fa-solid fa-credit-card", label: "Card" },
  { key: "paypal", icon: "fa-brands fa-paypal", label: "PayPal" },
  { key: "crypto", icon: "fa-brands fa-bitcoin", label: "Crypto" },
];

interface Props {
  total: number;
}

// Mock checkout only — no real payment provider wired up (per the "mock
// data first" decision). Submitting just simulates success.
export function CheckoutForm({ total }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      router.push("/checkout/success");
    }, 900);
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
              onClick={() => setMethod(pm.key)}
            >
              <i className={pm.icon} aria-hidden="true" />
              {pm.label}
            </button>
          ))}
        </div>
      </div>

      {method === "card" && (
        <div className="checkout-card">
          <div className="checkout-card__title">Card details</div>
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
        </div>
      )}

      {method !== "card" && (
        <div className="checkout-card">
          <div className="checkout-card__title">
            {method === "paypal" ? "PayPal" : "Crypto"}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            You&rsquo;ll be redirected to complete payment after clicking below.
          </p>
        </div>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </button>
    </form>
  );
}
