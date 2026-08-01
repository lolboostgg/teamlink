"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";

type Mode = "login" | "signup" | null;

interface AuthModalContextValue {
  open: (mode: Exclude<Mode, null>, onSuccess?: () => void) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

// Single shared login/signup modal instance for the whole app (mounted once
// in the root layout) so any button anywhere — header, CTA band, booking
// sidebar, checkout's identity step — can trigger it via useAuthModal()
// without prop-drilling. Mock auth only, per the mock-data-first decision;
// modeled after tapin.gg's Discord-or-email modal. The optional onSuccess
// callback lets callers (like checkout) react once the mock login/signup
// "completes", without the provider knowing anything about them.
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(null);
  const [notice, setNotice] = useState(false);
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);

  const open = useCallback((next: Exclude<Mode, null>, onSuccess?: () => void) => {
    setMode(next);
    setNotice(false);
    onSuccessRef.current = onSuccess;
  }, []);

  const close = useCallback(() => {
    setMode(null);
    setNotice(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(true);
    const onSuccess = onSuccessRef.current;
    window.setTimeout(() => {
      onSuccess?.();
      close();
    }, 700);
  }

  const value = useMemo(() => ({ open }), [open]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      <Modal open={mode !== null} onClose={close} labelledBy="auth-modal-title">
        <div className="auth-modal">
          <h2 id="auth-modal-title" className="auth-modal__title">
            {mode === "login" ? "Log in to TeamLink" : "Create your account"}
          </h2>
          <p className="auth-modal__sub">
            {mode === "login"
              ? "Welcome back — pick up right where you left off."
              : "Takes less than 30 seconds. No credit card required."}
          </p>

          <button type="button" className="btn btn--outline btn--block auth-modal__discord">
            <i className="fa-brands fa-discord" aria-hidden="true" />
            Continue with Discord
          </button>

          <div className="auth-modal__divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="form-row">
                <label htmlFor="auth-username">Username</label>
                <input id="auth-username" type="text" placeholder="Your in-game name" required />
              </div>
            )}
            <div className="form-row">
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="form-row">
              <label htmlFor="auth-password">Password</label>
              <input id="auth-password" type="password" placeholder="••••••••" required />
            </div>

            {notice && (
              <p className="auth-modal__notice">
                This is a demo — account creation isn&rsquo;t wired up yet.
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--block">
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="auth-modal__switch">
            {mode === "login" ? (
              <>
                New here? <button type="button" onClick={() => open("signup")}>Create an account</button>
              </>
            ) : (
              <>
                Already have an account? <button type="button" onClick={() => open("login")}>Log in</button>
              </>
            )}
          </p>
        </div>
      </Modal>
    </AuthModalContext.Provider>
  );
}
