export type PaymentMethodKey = "card" | "paypal" | "crypto";

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
}

// Mock payment placeholders — no live Stripe/PayPal SDK or crypto wallet
// integration (this project has no backend to hold API keys). Fees are
// illustrative, not real processor rates.
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
    note: "Network fee applies.",
  },
];

const METHOD_BY_KEY = new Map(PAYMENT_METHODS.map((m) => [m.key, m]));

export function getPaymentMethod(key: PaymentMethodKey): PaymentMethodMeta {
  return METHOD_BY_KEY.get(key) ?? PAYMENT_METHODS[0];
}

export function calculateFee(subtotalEUR: number, method: PaymentMethodKey): number {
  const meta = getPaymentMethod(method);
  return subtotalEUR * (meta.feePercent / 100) + meta.feeFixedEUR;
}
