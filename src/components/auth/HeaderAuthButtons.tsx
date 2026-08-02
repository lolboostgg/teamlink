"use client";

import { useAuthModal } from "./AuthModalProvider";

export function HeaderAuthButtons() {
  const { open, isAuthenticated, isLoading } = useAuthModal();

  // Don't assume signed-out while the session is still resolving — that's
  // what was flashing "Log in / Sign up" for a frame on every load even
  // when actually signed in.
  if (isLoading || isAuthenticated) return null;

  return (
    <>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => open("login")}>
        Log in
      </button>
      <button type="button" className="btn btn--primary btn--sm" onClick={() => open("signup")}>
        Sign up
      </button>
    </>
  );
}
