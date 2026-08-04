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
    { key: "country", label: "Country", required: true },
    { key: "currency", label: "Currency", placeholder: "EUR" },
    { key: "iban", label: "IBAN" },
    { key: "accountNumber", label: "Account number" },
    { key: "swift", label: "SWIFT / BIC", required: true },
    { key: "bankName", label: "Bank name" },
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

const IBAN_COUNTRY_CODES = new Set("AD AT AZ BH BE BA BR BG CR HR CY CZ DK DO EG SV EE FO FI FR GE DE GI GR GL GT HU IS IQ IE IL IT JO KZ XK KW LV LB LI LT LU MT MR MU MD MC ME NL MK NO PK PS PL PT QA RO LC SM ST SA RS SC SK SI ES SE CH TL TN TR UA AE GB VA VG".split(" "));

export function countryUsesIban(country: string): boolean {
  const normalized = country.trim();
  if (!normalized) return true;
  if (IBAN_COUNTRY_CODES.has(normalized.toUpperCase())) return true;
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return [...IBAN_COUNTRY_CODES].some((code) => names.of(code)?.toLowerCase() === normalized.toLowerCase());
}

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
    const iban = details.iban || details.accountNumber || "";
    const masked = iban.length > 6 ? `${iban.slice(0, 4)}••••${iban.slice(-3)}` : iban;
    return [details.beneficiary, masked].filter(Boolean).join(" · ") || "Bank transfer";
  }
  const wallet = details.wallet ?? "";
  const masked = wallet.length > 10 ? `${wallet.slice(0, 5)}…${wallet.slice(-4)}` : wallet;
  return [details.coin, details.network && `(${details.network})`, masked].filter(Boolean).join(" ") || "Crypto";
}
