"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ActiveBackgroundContextValue {
  activeSlug: string | null;
  setActiveBackground: (slug: string | null) => void;
}

const ActiveBackgroundContext = createContext<ActiveBackgroundContextValue | null>(null);

export function useActiveBackground() {
  const ctx = useContext(ActiveBackgroundContext);
  if (!ctx) throw new Error("useActiveBackground must be used within ActiveBackgroundProvider");
  return ctx;
}

// Tracks which game's ambient backdrop should be showing (see
// AmbientGameBackground) — set on hover/select from the hero game picker
// and the /games listing grid.
export function ActiveBackgroundProvider({ children }: { children: ReactNode }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const setActiveBackground = useCallback((slug: string | null) => setActiveSlug(slug), []);
  const value = useMemo(() => ({ activeSlug, setActiveBackground }), [activeSlug, setActiveBackground]);

  return <ActiveBackgroundContext.Provider value={value}>{children}</ActiveBackgroundContext.Provider>;
}
