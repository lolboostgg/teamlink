"use client";

import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { LANGUAGES } from "@/lib/i18n";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { FlagIcon } from "@/components/ui/FlagIcon";

// Kept intentionally short for now (just EUR/USD) rather than the full
// 18-currency list — most visitors only need one of these two.
const FEATURED_CURRENCIES: { code: CurrencyCode; flagIso: string }[] = [
  { code: "EUR", flagIso: "eu" },
  { code: "USD", flagIso: "us" },
];

// Hover/click dropdown panel (see SettingsTrigger) — one scrollable list
// (language) with a fixed currency row underneath, both visible at once.
export function SettingsPanel() {
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="dropdown-switcher__menu dropdown-switcher__menu--right dropdown-switcher__menu--settings settings-panel">
      <div className="settings-panel__title">Language</div>
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

      <div className="settings-panel__currency-row">
        <div className="settings-panel__title">Currency</div>
        <div className="settings-panel__currency-pills">
          {FEATURED_CURRENCIES.map((c) => {
            const meta = CURRENCIES.find((m) => m.code === c.code)!;
            return (
              <button
                key={c.code}
                type="button"
                className={`settings-panel__currency-pill${c.code === currency ? " is-active" : ""}`}
                onClick={() => setCurrency(c.code)}
              >
                <FlagIcon iso={c.flagIso} label={meta.label} className="settings-panel__currency-flag" />
                {meta.code}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
