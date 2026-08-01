"use client";

import { useAuthModal } from "./AuthModalProvider";

export function HeaderAuthButtons() {
  const { open } = useAuthModal();

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
