"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DashboardRole } from "@/lib/roles";

const STORAGE_KEY = "teamlink:role";

interface RoleContextValue {
  role: DashboardRole;
  setRole: (role: DashboardRole) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

// Tracks which of the 3 demo dashboards ("Client"/"Admin"/"Teammate") the
// header's Dashboard link and the floating RoleSwitcher should point at.
// There's no real auth in this project, so this is a persisted UI
// preference, not a session.
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DashboardRole>("client");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as DashboardRole | null;
    // See CurrencyProvider — same hydration-safe, one-time localStorage sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setRoleState(stored);
  }, []);

  const setRole = useCallback((next: DashboardRole) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
