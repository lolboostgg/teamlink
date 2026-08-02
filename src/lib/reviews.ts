"use client";

import { useSyncExternalStore } from "react";

const KEY = "teamlink:reviews";
const listeners = new Set<() => void>();

export interface Review {
  id: string;
  teammateId: string;
  orderId: string;
  rating: number;
  createdAt: number;
}

function readRaw(): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function readReviews(): Review[] {
  try {
    return JSON.parse(readRaw());
  } catch {
    return [];
  }
}

function notify() {
  listeners.forEach((cb) => cb());
}

// Persisted the moment the customer clicks a star on Session Complete — no
// separate "submit" step, matching how that control already behaves
// visually. One review per order (re-rating an order overwrites its entry
// instead of stacking duplicates).
export function addReview(teammateId: string, orderId: string, rating: number): void {
  if (typeof window === "undefined") return;
  const existing = readReviews().filter((r) => r.orderId !== orderId);
  const next: Review[] = [...existing, { id: `rv-${orderId}`, teammateId, orderId, rating, createdAt: Date.now() }];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

export function getReviewsForTeammate(teammateId: string): Review[] {
  return readReviews()
    .filter((r) => r.teammateId === teammateId)
    .sort((a, b) => b.createdAt - a.createdAt);
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

// Hydration-safe reactive read — see lib/favorites.ts for the same pattern.
export function useReviews(): Review[] {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
