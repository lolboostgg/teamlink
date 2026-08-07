"use client";

import { useEffect, useRef, useState } from "react";
import { PAYMENT_METHODS, getPaymentMethod, type PaymentMethodKey } from "@/lib/payments";

/**
 * Picks how a one-off charge is paid, without sending anyone through
 * checkout for it. Tips and replays used to be hardwired to "card", which
 * quietly ignored a customer sitting on a credits balance.
 *
 * Crypto is listed but refused (see PAYMENT_METHODS) — shown rather than
 * hidden so the option reads as "not yet" instead of missing.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: PaymentMethodKey;
  onChange: (value: PaymentMethodKey) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const meta = getPaymentMethod(value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`pay-picker${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="pay-picker__trigger"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <i className={meta.icon} aria-hidden="true" />
        <span>{meta.label}</span>
        <i className="fa-solid fa-chevron-down pay-picker__caret" aria-hidden="true" />
      </button>

      {open && (
        <ul className="pay-picker__menu" role="listbox" aria-label="Payment method">
          {PAYMENT_METHODS.map((method) => (
            <li key={method.key}>
              <button
                type="button"
                role="option"
                aria-selected={method.key === value}
                disabled={method.unavailable}
                className={method.key === value ? "is-active" : ""}
                onClick={() => {
                  onChange(method.key);
                  setOpen(false);
                }}
              >
                <i className={method.icon} aria-hidden="true" />
                <span>{method.label}</span>
                {method.unavailable ? (
                  <small>Soon</small>
                ) : (
                  method.key === value && <i className="fa-solid fa-check" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
