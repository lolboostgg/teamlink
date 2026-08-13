"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProfileOption } from "@/lib/gameProfiles";

interface Props {
  label: string;
  value: string[];
  options: ProfileOption[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}

function OptionMark({ option }: { option: ProfileOption }) {
  if (option.icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={option.icon} alt="" className="icon-select__icon" loading="lazy" />;
  }
  if (option.glyph) return <i className={`${option.glyph} icon-select__glyph`} aria-hidden="true" />;
  return null;
}

/**
 * Searchable multi-select for large option sets (champion/agent rosters).
 * Picked entries leave the list and become removable chips above it, so the
 * dropdown only ever shows what's still available.
 */
export function IconMultiSelect({ label, value, options, placeholder = "Add…", onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  /**
   * Adds one option and empties the search box.
   *
   * The clear is the point. Typing "thr" and picking Thresh used to leave
   * "thr" sitting in the box, so the list stayed filtered to a search whose
   * only match had just been taken — which reads as "nothing left to add" and
   * looks like the picker broke. A multi-select is normally used to add
   * several in a row, so the cursor goes back to an empty box ready for the
   * next name.
   */
  function pick(optionValue: string) {
    onChange([...value, optionValue]);
    setQuery("");
    // Clicking an option moved focus to a button that is about to disappear
    // from the list, which drops focus to the body and ends keyboard use.
    searchRef.current?.focus();
  }

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const selected = value.map((v) => byValue.get(v)).filter((o): o is ProfileOption => Boolean(o));

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    const chosen = new Set(value);
    return options.filter((o) => !chosen.has(o.value) && (!q || o.label.toLowerCase().includes(q)));
  }, [options, query, value]);

  return (
    <div className={`icon-multi${open ? " is-open" : ""}`} ref={rootRef}>
      {selected.length > 0 && (
        <div className="icon-multi__selected">
          {selected.map((o) => (
            <button
              key={o.value}
              type="button"
              className="icon-multi__tag"
              onClick={() => onChange(value.filter((v) => v !== o.value))}
              aria-label={`Remove ${o.label}`}
            >
              <OptionMark option={o} />
              <span>{o.label}</span>
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="icon-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <i className="fa-solid fa-plus icon-select__glyph" aria-hidden="true" />
        <span className="icon-select__placeholder">
          {placeholder}
          {selected.length > 0 && ` (${selected.length} selected)`}
        </span>
        <i className="fa-solid fa-chevron-down icon-select__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="icon-select__list icon-multi__panel">
          <div className="pill-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={`Search ${label.toLowerCase()}…`}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (available[0]) pick(available[0].value);
                }
              }}
            />
          </div>

          <ul role="listbox" aria-label={label} aria-multiselectable="true">
            {available.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="icon-select__option"
                  onClick={() => pick(o.value)}
                >
                  <OptionMark option={o} />
                  <span>{o.label}</span>
                </button>
              </li>
            ))}
            {available.length === 0 && <li className="icon-multi__empty">Nothing left to add.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
