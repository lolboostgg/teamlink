"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ProfileOption } from "@/lib/gameProfiles";

interface Props {
  label: string;
  value: string | null;
  options: ProfileOption[];
  placeholder?: string;
  /** Adds a filter box above the list — worth it past ~20 options. */
  searchable?: boolean;
  onChange: (value: string | null) => void;
}

/**
 * Replacement for a native <select> wherever options carry art. A native
 * select can't render per-option icons (and paints its popup with the OS
 * theme, which fights the dark UI), so this is a button + listbox with
 * keyboard support.
 */
export function IconSelect({ label, value, options, placeholder = "Not set", searchable = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? null;
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (needle ? options.filter((o) => `${o.label} ${o.value}`.toLowerCase().includes(needle)) : options),
    [options, needle],
  );
  // The list shrinks as you type, so the stored cursor can point past its end.
  // Clamped on read rather than corrected in an effect — the effect rendered
  // one frame with the stale index before fixing it.
  const activeIndex = Math.min(active, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  // Opening starts on the current selection; the filter box always starts empty.
  function openList() {
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function commit(index: number) {
    const option = filtered[index];
    if (!option) return;
    onChange(option.value === value ? null : option.value);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActive((activeIndex + (e.key === "ArrowDown" ? 1 : filtered.length - 1)) % filtered.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(activeIndex);
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
        onClick={() => (open ? close() : openList())}
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

      {open && searchable && (
        <label className="icon-select__search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            placeholder={`Search ${label.toLowerCase()}…`}
            aria-label={`Search ${label}`}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              // Space has to stay typable here, so only the navigation keys pass through.
              if (e.key === "Escape" || e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") onKeyDown(e);
            }}
          />
        </label>
      )}

      {open && (
        <ul className={`icon-select__list${searchable ? " icon-select__list--under-search" : ""}`} id={listId} role="listbox" aria-label={label}>
          {filtered.length === 0 && <li className="icon-select__empty">No matches found.</li>}
          {filtered.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`icon-select__option${i === activeIndex ? " is-active" : ""}${
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
