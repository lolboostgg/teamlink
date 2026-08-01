"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";

interface Props {
  amountEUR: number;
  className?: string;
}

// Single reuse point for every price render site in the app — swap a raw
// `${x.toFixed(2)}` string for <PriceTag amountEUR={x}/> and it reacts to
// the header currency switcher with no page reload.
export function PriceTag({ amountEUR, className }: Props) {
  const { format } = useCurrency();
  return <span className={className}>{format(amountEUR)}</span>;
}
