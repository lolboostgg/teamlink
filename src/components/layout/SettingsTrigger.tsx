"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { getCurrencyMeta } from "@/lib/currency";
import { getLanguageMeta } from "@/lib/i18n";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { FlagIcon } from "@/components/ui/FlagIcon";

const CLOSE_DELAY_MS = 200;

// The single settings entry point used identically in the marketing header
// and the dashboard topbar. Opens on hover (with a short close-delay so
// moving the cursor from trigger to panel doesn't flicker it shut) and also
// toggles on click, so it works the same for mouse, touch, and keyboard.
export function SettingsTrigger() {
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const currencyMeta = getCurrencyMeta(currency);
  const languageMeta = getLanguageMeta(language);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <div
      className="dropdown-switcher"
      ref={rootRef}
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="dropdown-switcher__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="dropdown-switcher__symbol">{currencyMeta.symbol}</span>
        <span className="dropdown-switcher__code">{currencyMeta.code}</span>
        <span className="settings-trigger__sep">·</span>
        <FlagIcon iso={languageMeta.flagIso} label={languageMeta.label} className="dropdown-switcher__flag" />
        <span className="dropdown-switcher__code">{languageMeta.code.toUpperCase()}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>

      {open && <SettingsPanel />}
    </div>
  );
}
