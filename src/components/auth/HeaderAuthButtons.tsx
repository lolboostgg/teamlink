"use client";

import { useAuthModal } from "./AuthModalProvider";

export function HeaderAuthButtons() {
  const { open, isAuthenticated, isLoading } = useAuthModal();

  // Don't assume signed-out while the session is still resolving — that's
  // what was flashing "Log in / Sign up" for a frame on every load even
  // when actually signed in.
  if (isLoading || isAuthenticated) return null;

  // One button rather than the login/signup pair. Signing up is reachable
  // from inside the modal, which is where somebody without an account ends
  // up anyway — and the header stops asking a first-time visitor to choose
  // between two things before they have seen the site.
  return (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => open("login")}>
      <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Login
    </button>
  );
}
