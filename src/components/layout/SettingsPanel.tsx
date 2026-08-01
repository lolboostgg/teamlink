"use client";

import { useState } from "react";
import { CURRENCIES } from "@/lib/currency";
import { LANGUAGES } from "@/lib/i18n";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { FlagIcon } from "@/components/ui/FlagIcon";

type Tab = "language" | "currency";

// Hover/click dropdown panel (see SettingsTrigger) — tabbed so only one
// list is visible at a time instead of stacking both, which reads cleaner
// for the 18-currency / 6-language lists than a single long scroll.
export function SettingsPanel() {
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();
  const [tab, setTab] = useState<Tab>("language");
  const activeLanguage = LANGUAGES.find((l) => l.code === language);

  return (
    <div className="dropdown-switcher__menu dropdown-switcher__menu--right dropdown-switcher__menu--settings settings-panel">
      <div className="settings-panel__tabs">
        <button
          type="button"
          className={`settings-panel__tab${tab === "language" ? " is-active" : ""}`}
          onClick={() => setTab("language")}
        >
          {activeLanguage && <FlagIcon iso={activeLanguage.flagIso} className="settings-panel__tab-flag" />}
          Language
        </button>
        <button
          type="button"
          className={`settings-panel__tab${tab === "currency" ? " is-active" : ""}`}
          onClick={() => setTab("currency")}
        >
          <span className="settings-panel__tab-symbol">{CURRENCIES.find((c) => c.code === currency)?.symbol}</span>
          Currency
        </button>
      </div>

      {tab === "language" ? (
        <div className="settings-panel__lang-list">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`settings-panel__lang-item${l.code === language ? " is-active" : ""}`}
              onClick={() => setLanguage(l.code)}
            >
              <FlagIcon iso={l.flagIso} label={l.label} className="settings-panel__lang-flag" />
              <span>{l.label}</span>
              {l.code === language && <i className="fa-solid fa-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="settings-panel__currency-grid">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              className={`settings-panel__currency-item${c.code === currency ? " is-active" : ""}`}
              onClick={() => setCurrency(c.code)}
            >
              <span className="settings-panel__currency-symbol">{c.symbol}</span>
              <span>
                <span className="settings-panel__currency-code">{c.code}</span>
                <span className="settings-panel__currency-label">{c.label}</span>
              </span>
              {c.code === currency && <i className="fa-solid fa-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
