"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/components/language/LanguageProvider";

// Same `.dropdown-switcher` pattern/CSS as CurrencySwitcher.
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
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

  const active = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className="dropdown-switcher" ref={ref}>
      <button
        type="button"
        className="dropdown-switcher__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdown-switcher__symbol">{active.flag}</span>
        <span className="dropdown-switcher__code">{active.code.toUpperCase()}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-switcher__menu" role="listbox">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === language}
              className={`dropdown-switcher__item${l.code === language ? " is-active" : ""}`}
              onClick={() => {
                setLanguage(l.code);
                setOpen(false);
              }}
            >
              <span className="dropdown-switcher__item-symbol">{l.flag}</span>
              <span>
                <span className="dropdown-switcher__item-code">{l.code.toUpperCase()}</span>
                <span className="dropdown-switcher__item-label">{l.nativeLabel}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
