"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

interface Props {
  children: ReactNode;
  // Server already knows (via auth()) whether this request was
  // authenticated — passed down as a plain boolean instead of a second
  // <SessionProvider session={session}> nested inside the tree. That
  // nesting was tried first and seemed to fix this component (which reads
  // useSession() itself, so it *does* bind to the nearest/nested provider),
  // but it broke every OTHER useSession() consumer that lives outside that
  // subtree — most importantly the site header, which is a sibling higher
  // up in the tree, not a descendant of the nested provider. Two
  // next-auth SessionProviders mounted on the same page turned out to
  // interfere with each other at the client-fetch level: the header got
  // permanently stuck showing "Log in/Sign up" on dashboard routes, not
  // just briefly flashing it. A single root SessionProvider plus this
  // plain prop avoids that entirely.
  initiallyAuthenticated: boolean;
}

// Gates /dashboard/* behind the same mock login used everywhere else on the
// site — guest checkout stays guest-accessible, this gate is dashboard-only.
export function DashboardAuthGate({ children, initiallyAuthenticated }: Props) {
  const { status } = useSession();
  const { open } = useAuthModal();
  // Trust the server's already-known answer until the root provider's own
  // client fetch catches up (typically well under a second) — avoids ever
  // rendering the lock screen for someone the server just confirmed is
  // signed in, without needing a second SessionProvider to do it.
  const isLoading = status === "loading" && !initiallyAuthenticated;
  const isAuthenticated = status === "authenticated" || initiallyAuthenticated;

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
