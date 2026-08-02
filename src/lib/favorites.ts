"use client";

import { useSyncExternalStore } from "react";

const KEY = "teamlink:favorites";
// Same-tab listeners — the native "storage" event only fires in *other*
// tabs, so a same-tab write (the common case: favorite on Session
// Complete, then navigate to /dashboard/client/favorites) needs its own
// notify so useFavoriteIds() picks up the change without a full reload.
const listeners = new Set<() => void>();

function readRaw(): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function notify() {
  listeners.forEach((cb) => cb());
}

export function getFavoriteIds(): string[] {
  try {
    return JSON.parse(readRaw());
  } catch {
    return [];
  }
}

export function isFavorite(teammateId: string): boolean {
  return getFavoriteIds().includes(teammateId);
}

export function setFavorite(teammateId: string, favorited: boolean): string[] {
  const ids = getFavoriteIds();
  const next = favorited ? Array.from(new Set([...ids, teammateId])) : ids.filter((id) => id !== teammateId);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
  return next;
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
  return "[]";
}

// Hydration-safe + setState-in-effect-safe reactive read (see
// lib/lastGame.ts for the same pattern) — the raw JSON string is what
// useSyncExternalStore compares between renders, so identical content
// never looks like a change even though JSON.parse below returns a fresh
// array reference each call.
export function useFavoriteIds(): string[] {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
