export interface CreditPackage {
  id: string;
  payEUR: number;
  bonusEUR: number;
  badge?: "popular" | "best";
}

// Round, easy-to-compare tiers with an escalating bonus % the more you
// load at once — the €100 tier's +€10 (10%) matches the example given when
// this was speced. No real payment gateway exists in this app yet (see
// lib/payments.ts) — "buying" a package here just credits the ledger
// directly after a mock confirm step, same honesty level as the rest of
// checkout's payment UI.
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "cp-25", payEUR: 25, bonusEUR: 0 },
  { id: "cp-50", payEUR: 50, bonusEUR: 3 },
  { id: "cp-100", payEUR: 100, bonusEUR: 10, badge: "popular" },
  { id: "cp-250", payEUR: 250, bonusEUR: 30 },
  { id: "cp-500", payEUR: 500, bonusEUR: 75, badge: "best" },
];

export function getCreditPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
