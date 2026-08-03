"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ProfileOption } from "@/lib/gameProfiles";

interface Props {
  label: string;
  value: string | null;
  options: ProfileOption[];
  placeholder?: string;
  onChange: (value: string | null) => void;
}

/**
 * Replacement for a native <select> wherever options carry art. A native
 * select can't render per-option icons (and paints its popup with the OS
 * theme, which fights the dark UI), so this is a button + listbox with
 * keyboard support.
 */
export function IconSelect({ label, value, options, placeholder = "Not set", onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value === value ? null : option.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(active);
    }
  }

  return (
    <div className={`icon-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="icon-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        {selected?.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.icon} alt="" className="icon-select__icon" />
        ) : selected?.glyph ? (
          <i className={`${selected.glyph} icon-select__glyph`} aria-hidden="true" />
        ) : null}
        <span className={selected ? "" : "icon-select__placeholder"}>{selected?.label ?? placeholder}</span>
        <i className="fa-solid fa-chevron-down icon-select__chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul className="icon-select__list" id={listId} role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`icon-select__option${i === active ? " is-active" : ""}${
                  o.value === value ? " is-selected" : ""
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
              >
                {o.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.icon} alt="" className="icon-select__icon" />
                ) : o.glyph ? (
                  <i className={`${o.glyph} icon-select__glyph`} aria-hidden="true" />
                ) : null}
                <span>{o.label}</span>
                {o.value === value && <i className="fa-solid fa-check icon-select__check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
