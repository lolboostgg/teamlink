"use client";

import { useState } from "react";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { LANGUAGES } from "@/lib/i18n";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { FlagIcon } from "@/components/ui/FlagIcon";

type Tab = "language" | "currency";

// Kept intentionally short for now (just EUR/USD) rather than the full
// 18-currency list — most visitors only need one of these two.
const FEATURED_CURRENCIES: { code: CurrencyCode; flagIso?: string }[] = [
  { code: "EUR" },
  { code: "USD", flagIso: "us" },
];

// Hover/click dropdown panel (see SettingsTrigger) — tabbed so only one
// list is visible at a time instead of stacking both.
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
        <div className="settings-panel__currency-row">
          {FEATURED_CURRENCIES.map((c) => {
            const meta = CURRENCIES.find((m) => m.code === c.code)!;
            return (
              <button
                key={c.code}
                type="button"
                className={`settings-panel__currency-pill${c.code === currency ? " is-active" : ""}`}
                onClick={() => setCurrency(c.code)}
              >
                {c.flagIso ? (
                  <FlagIcon iso={c.flagIso} label={meta.label} className="settings-panel__currency-flag" />
                ) : (
                  <span className="settings-panel__currency-flag settings-panel__currency-flag--euro">€</span>
                )}
                {meta.code}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
