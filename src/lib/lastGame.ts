"use client";

import { useSyncExternalStore } from "react";

const KEY = "teamlink:lastGame";

export function setLastGameSlug(slug: string): void {
  try {
    localStorage.setItem(KEY, slug);
  } catch {
    // ignore (private browsing / storage disabled)
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

// Reads the last-selected game slug without a setState-in-effect: the server
// snapshot is always null (matching first paint everywhere), and React syncs
// in the real client-side value right after hydration on its own.
export function useLastGameSlug(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
