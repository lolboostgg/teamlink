"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Favorites, read straight from the account.
 *
 * This used to keep its own localStorage copy and sync it to the server in
 * the background, which meant favorites followed the browser rather than the
 * customer — a second device saw none of them, and clearing site data looked
 * like unfavoriting everything. The API is the only source now; the toggle is
 * applied optimistically so the heart still reacts instantly.
 */

const listeners = new Set<(ids: string[]) => void>();
let cache: string[] = [];

function publish(ids: string[]) {
  cache = ids;
  listeners.forEach((listener) => listener(ids));
}

async function load(): Promise<string[]> {
  const response = await fetch("/api/favorites", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return cache;
  const data = (await response.json()) as { favoriteIds?: string[] };
  return data.favoriteIds ?? [];
}

/** Toggles a favorite and tells every mounted hook about it right away. */
export async function setFavorite(teammateId: string, favorited: boolean): Promise<void> {
  publish(favorited ? Array.from(new Set([...cache, teammateId])) : cache.filter((id) => id !== teammateId));

  const response = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teammateId, favorited }),
  }).catch(() => null);

  // Whatever the server ended up with wins — a rejected toggle (signed out,
  // unknown teammate) must not leave the heart lit.
  if (!response?.ok) publish(await load());
}

export function useFavoriteIds(): string[] {
  const [ids, setIds] = useState<string[]>(cache);

  useEffect(() => {
    listeners.add(setIds);
    let cancelled = false;
    void load().then((fresh) => {
      if (!cancelled) publish(fresh);
    });
    return () => {
      cancelled = true;
      listeners.delete(setIds);
    };
  }, []);

  return ids;
}

/** The favorite state of one teammate, plus its toggle. */
export function useIsFavorite(teammateId: string): [boolean, () => void] {
  const ids = useFavoriteIds();
  const favorited = ids.includes(teammateId);
  const toggle = useCallback(() => void setFavorite(teammateId, !favorited), [teammateId, favorited]);
  return [favorited, toggle];
}
