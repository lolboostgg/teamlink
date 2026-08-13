"use client";

import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";

/**
 * The header's dropdowns, behaving as one thing.
 *
 * Four of these live side by side — settings, credits, the bell, the account
 * menu — and each had grown its own copy of open state, an outside-click
 * listener and, in two cases, a hover timer. Copies drift: two opened on
 * hover and two only on click, and because none of them knew about the
 * others, hovering across the row left a trail of open panels overlapping
 * each other.
 *
 * Which one is open is therefore not per-component state. It is one module
 * variable holding at most one id, read through useSyncExternalStore so that
 * opening one re-renders — and closes — every other. Mutual exclusion falls
 * out of the data shape rather than out of four components remembering to
 * tell each other.
 */

/** The id of the single open dropdown, or null when they are all shut. */
let openId: string | null = null;
const listeners = new Set<() => void>();

function publish(next: string | null) {
  if (openId === next) return;
  openId = next;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/**
 * Moving the cursor from a trigger to its own panel crosses a gap, and
 * closing on the way would make the panel unreachable. Long enough to cross,
 * short enough that a deliberate move away feels immediate.
 */
const CLOSE_DELAY_MS = 200;

export interface HeaderDropdown {
  open: boolean;
  /** Put on the wrapper: carries hover open/close for pointer users. */
  rootProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  /** Put on the trigger button, alongside its own aria-label. */
  triggerProps: {
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    onClick: () => void;
  };
  close: () => void;
}

export function useHeaderDropdown<T extends HTMLElement = HTMLDivElement>(): HeaderDropdown & {
  rootRef: React.RefObject<T | null>;
} {
  const id = useId();
  const rootRef = useRef<T>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server-rendered markup has nothing open, so the third argument is false.
  const open = useSyncExternalStore(subscribe, () => openId === id, () => false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearCloseTimer();
    // Only ever closes itself. A dropdown that has already lost the slot to
    // another one must not shut that one on its way out.
    if (openId === id) publish(null);
  }, [clearCloseTimer, id]);

  const openNow = useCallback(() => {
    clearCloseTimer();
    publish(id);
  }, [clearCloseTimer, id]);

  const toggle = useCallback(() => {
    clearCloseTimer();
    publish(openId === id ? null : id);
  }, [clearCloseTimer, id]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(close, CLOSE_DELAY_MS);
  }, [clearCloseTimer, close]);

  // Outside click and Escape, only while this one is the open one.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // A dropdown that unmounts while open would otherwise leave the slot taken
  // and every other one unable to open.
  useEffect(() => () => { clearCloseTimer(); if (openId === id) publish(null); }, [clearCloseTimer, id]);

  return {
    open,
    rootRef,
    rootProps: { onMouseEnter: openNow, onMouseLeave: scheduleClose },
    triggerProps: { "aria-expanded": open, "aria-haspopup": "menu", onClick: toggle },
    close,
  };
}
