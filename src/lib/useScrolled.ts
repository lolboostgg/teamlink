"use client";

import { useSyncExternalStore } from "react";

const THRESHOLD = 8;

function subscribe(callback: () => void): () => void {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function getSnapshot(): boolean {
  return window.scrollY > THRESHOLD;
}

function getServerSnapshot(): boolean {
  return false;
}

// True once the page has scrolled past THRESHOLD — used to only give the
// header its frosted background/border after scroll starts, so it floats
// fully transparent over the hero art at rest.
export function useScrolled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
