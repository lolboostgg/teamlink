"use client";

import { useEffect, useId, useRef, useState } from "react";

export type OrdersStatusOption = {
  value: string;
  label: string;
  icon?: string;
};

type Props = {
  name?: string;
  value: string;
  options: OrdersStatusOption[];
  onChange?: (value: string) => void;
};

export function OrdersStatusSelect({ name, value, options, onChange }: Props) {
  const [selectedValue, setSelectedValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const currentValue = onChange ? value : selectedValue;
  const selected = options.find((option) => option.value === currentValue) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Opening puts the keyboard cursor on whatever is currently selected. Done
  // here rather than in an effect, so the first frame of the open menu already
  // highlights the right row.
  function openMenu() {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === currentValue)));
    setOpen(true);
  }

  function select(index: number) {
    const option = options[index];
    if (!option) return;
    setSelectedValue(option.value);
    onChange?.(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && ["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(activeIndex);
    }
  }

  return (
    <div className={`orders-status-select${open ? " is-open" : ""}`} ref={rootRef}>
      {name && <input type="hidden" name={name} value={currentValue} />}
      <button
        type="button"
        className="orders-status-select__trigger"
        aria-label="Filter orders by status"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span className="orders-status-select__label">Status</span>
        <span className="orders-status-select__value">
          {selected?.icon && <i className={selected.icon} aria-hidden="true" />}
          {selected?.label}
        </span>
        <i className="fa-solid fa-chevron-down orders-status-select__chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul className="orders-status-select__menu" id={listId} role="listbox" aria-label="Order status">
          {options.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === currentValue}
                className={`orders-status-select__option${index === activeIndex ? " is-active" : ""}${option.value === currentValue ? " is-selected" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(index)}
              >
                {option.icon && <i className={option.icon} aria-hidden="true" />}
                <span>{option.label}</span>
                {option.value === currentValue && <i className="fa-solid fa-check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
