"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BookingAddonChoice } from "@/lib/bookingOptions";

interface Props {
  label: string;
  choices: BookingAddonChoice[];
  value: string;
  onChange: (value: string) => void;
  /** Renders a surcharge in the caller's display currency. */
  formatPrice: (amountEUR: number) => string;
  /** Choice labels go through the caller's localiser, same as everywhere else. */
  localize: (value: string) => string;
}

/**
 * The keystone/tier/bracket picker.
 *
 * A native <select> was doing this job and could not be styled: the browser
 * paints the open list itself, so a white system menu dropped out of a dark
 * booking card — and on Windows the surcharges rendered as grey-on-white,
 * barely readable. This is a button and a list, which are ours to paint.
 *
 * What the native control gave for free and is re-implemented here: closing
 * on outside click and Escape, arrow-key movement with Enter to commit, and
 * the open list scrolling rather than growing past the card. What it does
 * not do is act like a form control — nothing here submits, the value lives
 * in React state, so no hidden input is needed.
 */
export function BookingAddonSelect({ label, choices, value, onChange, formatPrice, localize }: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() => Math.max(0, choices.findIndex((c) => c.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = choices.find((choice) => choice.value === value) ?? choices[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // The highlighted row has to be visible to be a highlight — opening on a
  // +20 with eleven rows above it would otherwise show the top of the list.
  useEffect(() => {
    if (!open) return;
    setHighlighted(Math.max(0, choices.findIndex((choice) => choice.value === value)));
  }, [open, choices, value]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>("[data-highlighted='true']")?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  function commit(index: number) {
    const choice = choices[index];
    if (choice) onChange(choice.value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlighted((current) => {
        const next = current + (event.key === "ArrowDown" ? 1 : -1);
        return Math.max(0, Math.min(choices.length - 1, next));
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) commit(highlighted);
      else setOpen(true);
    }
  }

  return (
    <div className={`booking-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="booking-select__button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
      >
        <span className="booking-select__value">{localize(selected?.label ?? "")}</span>
        {selected?.priceEUR ? (
          <span className="booking-select__price">+{formatPrice(selected.priceEUR)}</span>
        ) : null}
        <i className="fa-solid fa-chevron-down booking-select__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="booking-select__list" role="listbox" id={listId} ref={listRef} tabIndex={-1}>
          {choices.map((choice, index) => {
            const isSelected = choice.value === selected?.value;
            return (
              <button
                type="button"
                key={choice.value}
                role="option"
                aria-selected={isSelected}
                data-highlighted={index === highlighted}
                className={`booking-select__option${isSelected ? " is-selected" : ""}${
                  index === highlighted ? " is-highlighted" : ""
                }`}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => commit(index)}
              >
                <span>{localize(choice.label)}</span>
                {choice.priceEUR ? <span className="booking-select__option-price">+{formatPrice(choice.priceEUR)}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
