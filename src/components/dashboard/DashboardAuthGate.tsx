"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

// Gates /dashboard/* behind the same mock login used everywhere else on the
// site — guest checkout stays guest-accessible, this gate is dashboard-only.
export function DashboardAuthGate({ children }: { children: ReactNode }) {
  // Deliberately NOT using useAuthModal()'s isAuthenticated/isLoading here:
  // AuthModalProvider is mounted once at the app root (see AppProviders),
  // so its own useSession() call always binds to the *root* SessionProvider
  // — the one with no initial session, that starts every fresh page load at
  // "loading" and fetches client-side from scratch. Nesting a second,
  // server-preloaded SessionProvider inside dashboard/layout.tsx (see that
  // file) does nothing for AuthModalProvider, since Context binds to where
  // useSession() is *called*, not where the JSX visually nests. Calling
  // useSession() directly in this component — which IS rendered inside that
  // nested provider's subtree — picks up the correct, already-resolved
  // session immediately, with no flash on a hard refresh/direct link.
  const { status } = useSession();
  const { open } = useAuthModal();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

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
