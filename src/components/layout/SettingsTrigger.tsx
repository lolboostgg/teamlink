"use client";

import { useState } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { getCurrencyMeta } from "@/lib/currency";
import { getLanguageMeta } from "@/lib/i18n";
import { SettingsModal } from "@/components/layout/SettingsModal";

// The single settings entry point used identically in the marketing header
// and the dashboard topbar — this sameness is what makes the header "uniform"
// across the whole app instead of each surface rolling its own switchers.
export function SettingsTrigger() {
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const currencyMeta = getCurrencyMeta(currency);
  const languageMeta = getLanguageMeta(language);

  return (
    <>
      <button type="button" className="dropdown-switcher__trigger" onClick={() => setOpen(true)}>
        <span className="dropdown-switcher__symbol">{currencyMeta.symbol}</span>
        <span className="dropdown-switcher__code">{currencyMeta.code}</span>
        <span className="settings-trigger__sep">·</span>
        <span className="dropdown-switcher__symbol">{languageMeta.flag}</span>
        <span className="dropdown-switcher__code">{languageMeta.code.toUpperCase()}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
