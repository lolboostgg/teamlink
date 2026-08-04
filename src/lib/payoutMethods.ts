export type PayoutMethodType = "BANK" | "CRYPTO";

export interface PayoutField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

// Field set per payout rail. Adding a rail is a change here plus one enum
// value — the forms, the summary line and the sanitizer all read this.
export const PAYOUT_FIELDS: Record<PayoutMethodType, PayoutField[]> = {
  BANK: [
    { key: "beneficiary", label: "Beneficiary name", placeholder: "Exactly as on the account", required: true },
    { key: "iban", label: "IBAN", required: true },
    { key: "swift", label: "SWIFT / BIC", required: true },
    { key: "bankName", label: "Bank name" },
    { key: "country", label: "Country", required: true },
    { key: "currency", label: "Currency", placeholder: "EUR" },
    { key: "address", label: "Address", placeholder: "Street, ZIP, City", required: true },
  ],
  CRYPTO: [
    { key: "coin", label: "Coin", placeholder: "USDC", required: true },
    { key: "network", label: "Network", placeholder: "Solana", required: true },
    { key: "name", label: "Name", placeholder: "Your full name", required: true },
    { key: "exchange", label: "Wallet / exchange", placeholder: "e.g. Binance", required: true },
    { key: "country", label: "Country", placeholder: "e.g. Germany", required: true },
    { key: "wallet", label: "Wallet address", required: true },
  ],
};

export const PAYOUT_LABELS: Record<PayoutMethodType, string> = {
  BANK: "Bank transfer",
  CRYPTO: "Crypto",
};

/** Keeps only the keys the rail declares, trimmed and length-capped. */
export function sanitizePayoutDetails(type: PayoutMethodType, raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of PAYOUT_FIELDS[type] ?? []) {
    const value = raw?.[field.key];
    if (typeof value === "string" && value.trim()) out[field.key] = value.trim().slice(0, 200);
  }
  return out;
}

/** One-line summary for list rows — masks the account identifier. */
export function describePayoutMethod(type: PayoutMethodType, details: Record<string, string>): string {
  if (type === "BANK") {
    const iban = details.iban ?? "";
    const masked = iban.length > 6 ? `${iban.slice(0, 4)}••••${iban.slice(-3)}` : iban;
    return [details.beneficiary, masked].filter(Boolean).join(" · ") || "Bank transfer";
  }
  const wallet = details.wallet ?? "";
  const masked = wallet.length > 10 ? `${wallet.slice(0, 5)}…${wallet.slice(-4)}` : wallet;
  return [details.coin, details.network && `(${details.network})`, masked].filter(Boolean).join(" ") || "Crypto";
}
