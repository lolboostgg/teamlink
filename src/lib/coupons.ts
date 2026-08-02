"use client";

import { useSyncExternalStore } from "react";

const KEY = "teamlink:coupons";
const listeners = new Set<() => void>();

export interface Coupon {
  code: string;
  discountPercent: number;
  source: string;
  createdAt: number;
  usedAt: number | null;
}

function readRaw(): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function readCoupons(): Coupon[] {
  try {
    return JSON.parse(readRaw());
  } catch {
    return [];
  }
}

function writeCoupons(coupons: Coupon[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(coupons));
  listeners.forEach((cb) => cb());
}

// Called once a completed session's "10% off" code is generated (see
// SessionScreen) — turns what used to be a purely decorative, never-
// stored string into something checkout can actually look up and redeem.
// Idempotent by code, so re-rendering the session-complete screen doesn't
// duplicate it.
export function addCoupon(code: string, discountPercent: number, source: string): void {
  if (typeof window === "undefined") return;
  const existing = readCoupons();
  if (existing.some((c) => c.code === code)) return;
  writeCoupons([...existing, { code, discountPercent, source, createdAt: Date.now(), usedAt: null }]);
}

export function findCoupon(code: string): Coupon | undefined {
  const clean = code.trim().toUpperCase();
  return readCoupons().find((c) => c.code === clean);
}

export function markCouponUsed(code: string): void {
  const clean = code.trim().toUpperCase();
  const coupons = readCoupons();
  const idx = coupons.findIndex((c) => c.code === clean);
  if (idx === -1) return;
  const next = [...coupons];
  next[idx] = { ...next[idx]!, usedAt: Date.now() };
  writeCoupons(next);
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
export function useCoupons(): Coupon[] {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  try {
    return (JSON.parse(raw) as Coupon[]).filter((c) => !c.usedAt).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}
