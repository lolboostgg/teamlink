"use client";

import { useEffect, useRef, useState } from "react";
import { CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/components/currency/CurrencyProvider";

// Compact header dropdown — a full Modal is the wrong shape for this (it's
// an anchored menu, not a dialog). Click-outside + Escape to close, no page
// reload on selection (pure client state via CurrencyProvider).
export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  return (
    <div className="dropdown-switcher" ref={ref}>
      <button
        type="button"
        className="dropdown-switcher__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdown-switcher__symbol">{active.symbol}</span>
        <span className="dropdown-switcher__code">{active.code}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-switcher__menu" role="listbox">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              role="option"
              aria-selected={c.code === currency}
              className={`dropdown-switcher__item${c.code === currency ? " is-active" : ""}`}
              onClick={() => {
                setCurrency(c.code);
                setOpen(false);
              }}
            >
              <span className="dropdown-switcher__item-symbol">{c.symbol}</span>
              <span>
                <span className="dropdown-switcher__item-code">{c.code}</span>
                <span className="dropdown-switcher__item-label">{c.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
