"use client";

import { useEffect, useRef, useState } from "react";

export interface FieldSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  label: string;
  value: string;
  options: FieldSelectOption[];
  onChange: (value: string) => void;
}

// Custom dropdown (label above, icon + value + chevron trigger, dark
// floating menu) instead of a native <select> — the browser's own option
// list ignores the site's dark theme entirely on most platforms.
export function FieldSelect({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="field-select" ref={rootRef}>
      <span className="field-select__label">{label}</span>
      <button
        type="button"
        className="field-select__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="field-select__value">
          {current?.icon && <i className={current.icon} aria-hidden="true" />}
          {current?.label}
        </span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>

      {open && (
        <div className="field-select__menu" role="listbox">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`field-select__item${opt.value === value ? " is-active" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.icon && <i className={opt.icon} aria-hidden="true" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
