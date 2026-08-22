"use client";

/**
 * Holds the page still while something is open on top of it.
 *
 * `document.body.style.overflow = "hidden"` is the usual one-liner and it
 * does nothing here. The viewport takes its scrolling behaviour from the
 * root element, and only borrows body's when the root's own overflow is
 * `visible` — this stylesheet sets `html { overflow-x: clip }` (see
 * globals.css, where body deliberately is not the scroll container so
 * position:sticky keeps working), so the root is not visible and body's
 * value is never consulted. The lock has to go on the root itself.
 *
 * Locking removes the scrollbar, which widens the page by its width and
 * shifts the whole layout left for as long as a dialog is open. The gutter
 * is held open with padding for exactly that long.
 *
 * Counted rather than boolean: a dialog opening from inside another dialog
 * must not unlock the page when only the inner one closes.
 */
let locks = 0;
let restore: { overflow: string; paddingRight: string } | null = null;

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  locks += 1;
  if (locks > 1) return;

  const root = document.documentElement;
  restore = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };

  const scrollbar = window.innerWidth - root.clientWidth;
  root.style.overflow = "hidden";
  if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks > 0 || !restore) return;

  const root = document.documentElement;
  root.style.overflow = restore.overflow;
  root.style.paddingRight = restore.paddingRight;
  restore = null;
}
