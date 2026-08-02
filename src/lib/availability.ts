"use client";

import { useSyncExternalStore } from "react";

const KEY = "teamlink:availability";
const listeners = new Set<() => void>();

function readRaw(): string {
  if (typeof window === "undefined") return "1";
  try {
    return window.localStorage.getItem(KEY) ?? "1";
  } catch {
    return "1";
  }
}

export function isAvailable(): boolean {
  return readRaw() === "1";
}

export function setAvailable(available: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, available ? "1" : "0");
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot(): string {
  return "1";
}

// Persisted teammate availability toggle — same hydration-safe reactive
// pattern as lib/favorites.ts.
export function useIsAvailable(): boolean {
  return useSyncExternalStore(subscribe, readRaw, getServerSnapshot) === "1";
}
