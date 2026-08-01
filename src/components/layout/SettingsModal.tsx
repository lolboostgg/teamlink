"use client";

import { Modal } from "@/components/ui/Modal";
import { CURRENCIES } from "@/lib/currency";
import { LANGUAGES } from "@/lib/i18n";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Props {
  open: boolean;
  onClose: () => void;
}

// One combined settings dialog for currency + language, replacing the two
// separate header dropdowns — selections apply instantly (same providers as
// before, no page reload), the dialog just stays open so picking one doesn't
// force reopening the panel to also pick the other.
export function SettingsModal({ open, onClose }: Props) {
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();

  return (
    <Modal open={open} onClose={onClose} labelledBy="settings-modal-title">
      <div className="settings-modal">
        <h2 id="settings-modal-title" className="settings-modal__title">
          Currency &amp; Language
        </h2>

        <div className="settings-modal__section">
          <div className="settings-modal__label">Currency</div>
          <div className="settings-modal__grid">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`settings-modal__item${c.code === currency ? " is-active" : ""}`}
                onClick={() => setCurrency(c.code)}
              >
                <span className="settings-modal__item-symbol">{c.symbol}</span>
                <span>
                  <span className="settings-modal__item-code">{c.code}</span>
                  <span className="settings-modal__item-sub">{c.label}</span>
                </span>
                {c.code === currency && <i className="fa-solid fa-check" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-modal__section">
          <div className="settings-modal__label">Language</div>
          <div className="settings-modal__grid">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`settings-modal__item${l.code === language ? " is-active" : ""}`}
                onClick={() => setLanguage(l.code)}
              >
                <span className="settings-modal__item-symbol">{l.flag}</span>
                <span>
                  <span className="settings-modal__item-code">{l.code.toUpperCase()}</span>
                  <span className="settings-modal__item-sub">{l.nativeLabel}</span>
                </span>
                {l.code === language && <i className="fa-solid fa-check" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
