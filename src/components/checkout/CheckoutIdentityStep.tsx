"use client";

import { useState } from "react";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

interface Props {
  onContinueAsGuest: (email: string) => void;
  onLoggedIn: () => void;
}

// Guest checkout is always available and never blocked behind login — the
// "log in / register" path is an alternative, not a requirement.
export function CheckoutIdentityStep({ onContinueAsGuest, onLoggedIn }: Props) {
  const { open } = useAuthModal();
  const [email, setEmail] = useState("");

  function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    onContinueAsGuest(email);
  }

  return (
    <div className="checkout-card">
      <div className="checkout-card__title">How do you want to check out?</div>

      <form onSubmit={handleGuestSubmit}>
        <div className="form-row">
          <label htmlFor="checkout-guest-email">Email address</label>
          <input
            id="checkout-guest-email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn--primary btn--block">
          Continue as guest
        </button>
      </form>

      <div className="auth-modal__divider" style={{ margin: "18px 0" }}>
        <span>or</span>
      </div>

      <button
        type="button"
        className="btn btn--outline btn--block"
        onClick={() => open("login", onLoggedIn)}
      >
        <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
        Log in / Register
      </button>
    </div>
  );
}
