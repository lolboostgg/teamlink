"use client";

import { useEffect, useId, useRef, useState } from "react";

export type DashboardSelectOption = { value: string; label: string; icon?: string };

export function DashboardSelect({ name, value, options, label, placeholder = "Choose…", disabled = false, onChange }: {
  name?: string; value: string; options: DashboardSelectOption[]; label: string; placeholder?: string; disabled?: boolean; onChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = onChange ? value : internalValue;
  const selected = options.find(option => option.value === current);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  function choose(index: number) { const option = options[index]; if (!option) return; setInternalValue(option.value); onChange?.(option.value); setOpen(false); }
  function toggle() { if (disabled) return; setActive(Math.max(0, options.findIndex(option => option.value === current))); setOpen(value => !value); }
  function keys(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") return setOpen(false);
    if (!open && ["Enter", " ", "ArrowDown"].includes(event.key)) { event.preventDefault(); toggle(); return; }
    if (!open) return;
    if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setActive(index => (index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length); }
    if (["Enter", " "].includes(event.key)) { event.preventDefault(); choose(active); }
  }
  return <div className={`dashboard-select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`} ref={root}>
    {name && <input type="hidden" name={name} value={current}/>}<button type="button" className="dashboard-select__trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled} onClick={toggle} onKeyDown={keys}>
      <span>{selected?.icon && <i className={selected.icon}/>} {selected?.label || placeholder}</span><i className="fa-solid fa-chevron-down"/>
    </button>
    {open && <ul className="dashboard-select__menu" id={listId} role="listbox" aria-label={label}>{options.map((option, index) => <li key={option.value}><button type="button" role="option" aria-selected={option.value === current} className={`${index === active ? "is-active" : ""}${option.value === current ? " is-selected" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}>{option.icon && <i className={option.icon}/>}<span>{option.label}</span>{option.value === current && <i className="fa-solid fa-check"/>}</button></li>)}</ul>}
  </div>;
}
