"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}

export function Modal({ open, onClose, children, labelledBy }: Props) {
  // Portal to document.body so the overlay is never trapped as a containing
  // block by an ancestor with backdrop-filter/transform (e.g. the sticky
  // site header) — without this, `position: fixed; inset: 0` resolves
  // against that ancestor's box instead of the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Portal target only exists client-side; this one-time flip after
    // mount is the standard SSR-safe way to enable it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
