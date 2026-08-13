"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { getCurrencyMeta } from "@/lib/currency";
import { getLanguageMeta } from "@/lib/i18n";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { useHeaderDropdown } from "@/lib/useHeaderDropdown";

// The single settings entry point used identically in the marketing header
// and the dashboard topbar. Hover, click, outside-click and Escape all come
// from useHeaderDropdown, which is also what stops this and the three other
// header dropdowns from being open at the same time.
export function SettingsTrigger() {
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const { open, rootRef, rootProps, triggerProps } = useHeaderDropdown();

  const currencyMeta = getCurrencyMeta(currency);
  const languageMeta = getLanguageMeta(language);

  return (
    <div className="dropdown-switcher" ref={rootRef} {...rootProps}>
      <button type="button" className="dropdown-switcher__trigger" aria-label="Currency and language" {...triggerProps}>
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
