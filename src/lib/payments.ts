export type PaymentMethodKey = "card" | "paypal" | "crypto" | "credits";

export interface PaymentMethodMeta {
  key: PaymentMethodKey;
  label: string;
  brandLabel: string;
  icon: string;
  /** Percentage fee on the subtotal, illustrative only. */
  feePercent: number;
  /** Flat fee in EUR, illustrative only. */
  feeFixedEUR: number;
  note: string;
  /** Shown, but refused by checkout — no processor behind it. */
  unavailable?: boolean;
}

// The methods checkout offers. Card and PayPal are both taken through
// Stripe (see lib/stripeCheckout.ts), credits come off the Postgres balance,
// and crypto has no processor behind it yet — it is offered as unavailable
// rather than quietly faked. The fees below are what the customer is shown
// and what the server charges: calculateFee() is used on both sides.
export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    key: "card",
    label: "Card",
    brandLabel: "Stripe",
    icon: "fa-brands fa-cc-stripe",
    feePercent: 0,
    feeFixedEUR: 0,
    note: "No extra fees.",
  },
  {
    key: "paypal",
    label: "PayPal",
    brandLabel: "PayPal",
    icon: "fa-brands fa-paypal",
    feePercent: 2.9,
    feeFixedEUR: 0.35,
    note: "PayPal processing fee applies.",
  },
  {
    key: "crypto",
    label: "Crypto",
    brandLabel: "BTC / ETH / USDT",
    icon: "fa-brands fa-bitcoin",
    feePercent: 1.5,
    feeFixedEUR: 0,
    note: "Not connected yet.",
    unavailable: true,
  },
  {
    key: "credits",
    label: "Credits",
    brandLabel: "TeamLink Credits",
    icon: "fa-solid fa-coins",
    feePercent: 0,
    feeFixedEUR: 0,
    note: "Deducted from your balance instantly — no fee.",
  },
];

// Shared "we accept" icon set — footer and checkout trust strip both use
// this exact list so the payment badges stay consistent everywhere.
export const PAYMENT_ICONS = [
  "fa-brands fa-cc-visa",
  "fa-brands fa-cc-mastercard",
  "fa-brands fa-paypal",
  "fa-brands fa-apple-pay",
  "fa-brands fa-google-pay",
  "fa-brands fa-stripe",
  "fa-brands fa-bitcoin",
];

const METHOD_BY_KEY = new Map(PAYMENT_METHODS.map((m) => [m.key, m]));

export function getPaymentMethod(key: PaymentMethodKey): PaymentMethodMeta {
  return METHOD_BY_KEY.get(key) ?? PAYMENT_METHODS[0];
}

export function calculateFee(subtotalEUR: number, method: PaymentMethodKey): number {
  const meta = getPaymentMethod(method);
  return subtotalEUR * (meta.feePercent / 100) + meta.feeFixedEUR;
}

// "Pay as you play" has no real duration to bill against (no backend
// tracking actual session length), so this illustrative helper assumes the
// checkout total represents a ~15-minute session and derives a per-minute
// rate from it — purely for the live-ticking demo meter.
export function perMinuteRate(baseTotalEUR: number): number {
  return Math.max(0.05, baseTotalEUR / 15);
}
