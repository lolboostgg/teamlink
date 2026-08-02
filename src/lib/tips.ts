"use client";

import { useSyncExternalStore } from "react";

const KEY = "teamlink:tips";
const listeners = new Set<() => void>();

export interface Tip {
  id: string;
  teammateId: string;
  orderId: string;
  amountEUR: number;
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

function readTips(): Tip[] {
  try {
    return JSON.parse(readRaw());
  } catch {
    return [];
  }
}

function notify() {
  listeners.forEach((cb) => cb());
}

// Same persistence pattern as lib/reviews.ts — one tip per order (paying
// again for the same session overwrites rather than stacking), written the
// moment the mock payment confirm completes (see SessionScreen's tip
// confirm modal), not just held as unsent UI state.
export function addTip(teammateId: string, orderId: string, amountEUR: number): void {
  if (typeof window === "undefined") return;
  const existing = readTips().filter((t) => t.orderId !== orderId);
  const next: Tip[] = [...existing, { id: `tip-${orderId}`, teammateId, orderId, amountEUR, createdAt: Date.now() }];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

export function getTipForOrder(orderId: string): Tip | undefined {
  return readTips().find((t) => t.orderId === orderId);
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

export function useTips(): Tip[] {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
