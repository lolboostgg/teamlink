export type CurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "CHF"
  | "JPY"
  | "CAD"
  | "AUD"
  | "PLN"
  | "SEK"
  | "NOK"
  | "DKK"
  | "CZK"
  | "BRL"
  | "TRY"
  | "INR"
  | "MXN"
  | "ZAR"
  | "RON";

export interface CurrencyMeta {
  code: CurrencyCode;
  label: string;
  symbol: string;
  /** Units of this currency per 1 EUR. Static, illustrative rates — NOT
   *  live market data. There's no backend/FX feed in this project (mock
   *  data throughout); wire a real provider here before this ever handles
   *  real money. */
  rate: number;
  /** Decimal places to show. Defaults to 2; JPY has none. */
  decimals?: number;
}

// EUR is the canonical base unit everywhere in the app — every price in
// lib/bookingOptions.ts, mock dashboard data, etc. is a plain number
// meaning EUR. Switching currency only changes the *display*.
export const CURRENCIES: CurrencyMeta[] = [
  { code: "EUR", label: "Euro", symbol: "€", rate: 1 },
  { code: "USD", label: "US Dollar", symbol: "$", rate: 1.08 },
  { code: "GBP", label: "British Pound", symbol: "£", rate: 0.86 },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF", rate: 0.95 },
  { code: "JPY", label: "Japanese Yen", symbol: "¥", rate: 163, decimals: 0 },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$", rate: 1.47 },
  { code: "AUD", label: "Australian Dollar", symbol: "A$", rate: 1.63 },
  { code: "PLN", label: "Polish Zloty", symbol: "zł", rate: 4.28 },
  { code: "SEK", label: "Swedish Krona", symbol: "kr", rate: 11.3 },
  { code: "NOK", label: "Norwegian Krone", symbol: "kr", rate: 11.6 },
  { code: "DKK", label: "Danish Krone", symbol: "kr", rate: 7.46 },
  { code: "CZK", label: "Czech Koruna", symbol: "Kč", rate: 25.2 },
  { code: "BRL", label: "Brazilian Real", symbol: "R$", rate: 5.95 },
  { code: "TRY", label: "Turkish Lira", symbol: "₺", rate: 37.4 },
  { code: "INR", label: "Indian Rupee", symbol: "₹", rate: 90.1 },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$", rate: 20.1 },
  { code: "ZAR", label: "South African Rand", symbol: "R", rate: 19.8 },
  { code: "RON", label: "Romanian Leu", symbol: "lei", rate: 4.97 },
];

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrencyMeta(code: CurrencyCode): CurrencyMeta {
  return CURRENCY_BY_CODE.get(code) ?? CURRENCIES[0];
}

export function formatCurrency(amountInEUR: number, code: CurrencyCode): string {
  const meta = getCurrencyMeta(code);
  const converted = amountInEUR * meta.rate;
  const decimals = meta.decimals ?? 2;
  const value = converted.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${meta.symbol}${value}`;
}
