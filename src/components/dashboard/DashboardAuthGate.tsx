"use client";

import type { ReactNode } from "react";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

// Gates /dashboard/* behind the same mock login used everywhere else on the
// site — guest checkout stays guest-accessible, this gate is dashboard-only.
export function DashboardAuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, open } = useAuthModal();

  // The dashboard layouts pass a server-fetched session into a nested
  // SessionProvider, so this should already be resolved by the time it
  // renders — this is just a defensive fallback, not the primary fix.
  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="dashboard-lock">
        <div className="dashboard-lock__icon">
          <i className="fa-solid fa-lock" aria-hidden="true" />
        </div>
        <h1 className="dashboard-lock__title">Log in to view your dashboard</h1>
        <p className="dashboard-lock__sub">
          Bookings, earnings, chat and everything else live behind your account.
        </p>
        <button type="button" className="btn btn--primary" onClick={() => open("login")}>
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
          Log in
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
