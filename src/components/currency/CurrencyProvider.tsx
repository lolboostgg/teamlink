"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";

const STORAGE_KEY = "teamlink:currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  format: (amountInEUR: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

// Same Context+hook shape as AuthModalProvider — mounted once in the root
// layout so any component (header switcher, dashboards, checkout) can read
// or change the selected currency without prop-drilling. Defaults to EUR on
// first render for hydration safety, then syncs from localStorage — no
// server/cookie involved since there's no backend to read a locale from.
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    // One-time sync from a client-only source (localStorage) right after
    // mount, deliberately not read during the initial render — reading it
    // eagerly would mismatch the server-rendered "EUR" default and trigger
    // a hydration error. This is the correct escape hatch for that case,
    // not the "avoid effect" anti-pattern the rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setCurrencyState(stored);
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const format = useCallback((amountInEUR: number) => formatCurrency(amountInEUR, currency), [currency]);

  const value = useMemo(() => ({ currency, setCurrency, format }), [currency, setCurrency, format]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
