"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatCurrency, type CurrencyCode, type RateTable } from "@/lib/currency";

const STORAGE_KEY = "qup:currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  format: (amountInEUR: number) => string;
  /** ECB publication date, or null while the static fallback is in use. */
  rateDate: string | null;
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
  // Undefined until the ECB rates land; formatCurrency then falls back to the
  // static table, so the first paint matches what the server rendered.
  const [rates, setRates] = useState<RateTable | undefined>(undefined);
  const [rateDate, setRateDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fx")
      .then((response) => (response.ok ? response.json() : null))
      .then((snapshot: { rates: RateTable; date: string | null } | null) => {
        if (cancelled || !snapshot?.rates) return;
        setRates(snapshot.rates);
        setRateDate(snapshot.date);
      })
      .catch(() => {
        // The static table stays in effect; nothing to tell the user.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const format = useCallback(
    (amountInEUR: number) => formatCurrency(amountInEUR, currency, rates),
    [currency, rates],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, format, rateDate }),
    [currency, setCurrency, format, rateDate],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
