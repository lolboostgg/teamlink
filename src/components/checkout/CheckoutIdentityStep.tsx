"use client";

import { useState } from "react";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Props {
  onContinueAsGuest: (email: string) => void;
  onLoggedIn: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Guest checkout is always available and never blocked behind login — the
// "log in / register" path is an alternative, not a requirement. Validation
// is hand-rolled (noValidate + this) instead of relying on the browser's
// native constraint-validation popup, which is unstyled and (on this
// machine) shows up in the OS/browser locale rather than the site's.
export function CheckoutIdentityStep({ onContinueAsGuest, onLoggedIn }: Props) {
  const { open, isAuthenticated, logout } = useAuthModal();
  const { p } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError(p("Enter your email address to continue."));
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError(p("That doesn't look like a valid email address."));
      return;
    }
    setError(null);
    onContinueAsGuest(trimmed);
  }

  // Checkout should never leave it ambiguous whether you're logged in —
  // an authenticated visitor skips straight past the guest-email form
  // instead of being shown it as if signed out.
  if (isAuthenticated) {
    return (
      <div className="checkout-card">
        <div className="checkout-card__title">{p("How do you want to check out?")}</div>

        <div className="checkout-card__identity-text checkout-card__identity-text--standalone">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          {p("You're logged in")}
        </div>

        <button type="button" className="btn btn--primary btn--block" onClick={onLoggedIn}>
          {p("Continue")}
        </button>

        <button type="button" className="btn btn--ghost btn--block" onClick={logout} style={{ marginTop: 8 }}>
          {p("Not you? Log out")}
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-card">
      <div className="checkout-card__title">{p("How do you want to check out?")}</div>
      <p className="checkout-card__identity-hint">
        <i className="fa-solid fa-circle-info" aria-hidden="true" /> You&rsquo;re not logged in — checking out as a guest below, or log in first.
      </p>

      <form onSubmit={handleGuestSubmit} noValidate>
        <div className="form-row">
          <label htmlFor="checkout-guest-email">{p("Email address")}</label>
          <input
            id="checkout-guest-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            className={error ? "has-error" : undefined}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p className="form-row__error">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn--primary btn--block">
          {p("Continue as guest")}
        </button>
      </form>

      <div className="auth-modal__divider" style={{ margin: "18px 0" }}>
        <span>{p("or")}</span>
      </div>

      <button
        type="button"
        className="btn btn--outline btn--block"
        onClick={() => open("login", onLoggedIn)}
      >
        <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
        {p("Log in / Register")}
      </button>
    </div>
  );
}
