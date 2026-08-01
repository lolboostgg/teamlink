"use client";

import { CURRENCIES } from "@/lib/currency";
import { LANGUAGES } from "@/lib/i18n";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { FlagIcon } from "@/components/ui/FlagIcon";

// Hover/click dropdown panel (see SettingsTrigger) — a language list with
// real flag icons plus a compact currency pill row underneath, replacing
// the old two-grid modal dialog.
export function SettingsPanel() {
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="dropdown-switcher__menu dropdown-switcher__menu--settings settings-panel">
      <div className="settings-panel__section">
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
      </div>

      <div className="settings-panel__section settings-panel__section--currency">
        <div className="settings-panel__title">Currency</div>
        <div className="settings-panel__currency-row">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              className={`settings-panel__currency-pill${c.code === currency ? " is-active" : ""}`}
              onClick={() => setCurrency(c.code)}
            >
              <span className="settings-panel__currency-symbol">{c.symbol}</span>
              {c.code}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
