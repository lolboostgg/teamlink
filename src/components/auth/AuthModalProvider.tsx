"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import { useToast } from "@/components/ui/ToastProvider";

type Mode = "login" | "signup" | null;

interface AuthModalContextValue {
  open: (mode: Exclude<Mode, null>, onSuccess?: () => void) => void;
  isAuthenticated: boolean;
  // True only while next-auth is still resolving the session on first
  // load — distinct from "resolved to signed-out". Consumers should render
  // neither the signed-in nor signed-out UI while this is true, or every
  // page load flashes the wrong one for a frame (see HeaderAuthButtons,
  // DashboardAuthGate).
  isLoading: boolean;
  logout: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);
const AUTH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("AUTH_TIMEOUT")), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

// Single shared login/signup modal instance for the whole app (mounted once
// in the root layout) so any button anywhere — header, CTA band, booking
// sidebar, checkout's identity step, the dashboard auth gate — can trigger
// it via useAuthModal() without prop-drilling. Real accounts now (see
// src/auth.ts + api/auth/register) — signup hits the register API then
// signs in, login goes straight through NextAuth's credentials provider.
// The optional onSuccess callback lets callers (like checkout) react once
// login/signup completes, without the provider knowing about them.
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const open = useCallback((next: Exclude<Mode, null>, onSuccess?: () => void) => {
    setMode(next);
    setFormError(null);
    onSuccessRef.current = onSuccess;
  }, []);

  const close = useCallback(() => {
    setMode(null);
    setFormError(null);
  }, []);

  const logout = useCallback(() => {
    signOut({ redirect: false });
    showToast("Logged out", "info");
  }, [showToast]);

  // OAuth leaves the site entirely, so there's no result to await here — the
  // full-page redirect comes back to whatever page the modal was opened from.
  // Success/failure is reported by AuthErrorToast on that return trip.
  function startOAuth(provider: "discord" | "google") {
    setFormError(null);
    setSubmitting(true);
    signIn(provider, { callbackUrl: window.location.href });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("auth-email") ?? "").trim();
    const password = String(data.get("auth-password") ?? "");
    const username = String(data.get("auth-username") ?? "").trim();
    const remember = data.get("auth-remember") === "on";
    const missing = !email || !password || (mode === "signup" && !username);
    if (missing) {
      setFormError("Fill in every field to continue.");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const res = await withTimeout(fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: username }),
        }));
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setFormError(body?.error ?? "Something went wrong, try again.");
          return;
        }
      }

      const result = await withTimeout(
        signIn("credentials", { email, password, remember: String(remember), redirect: false }),
      );
      if (result?.error) {
        setFormError("Incorrect email or password.");
        return;
      }

      showToast(mode === "signup" ? "Account created" : "Logged in successfully", "success");
      onSuccessRef.current?.();
      close();
    } catch (error) {
      setFormError(
        error instanceof Error && error.message === "AUTH_TIMEOUT"
          ? "Login took too long. Please try again — the server may be waking up."
          : "We couldn't reach the login server. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const value = useMemo(
    () => ({ open, isAuthenticated, isLoading, logout }),
    [open, isAuthenticated, isLoading, logout],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      <AuthErrorToast />

      <Modal open={mode !== null} onClose={close} labelledBy="auth-modal-title">
        <div className="auth-modal">
          <h2 id="auth-modal-title" className="auth-modal__title">
            {mode === "login" ? "Log in to TeamLink" : "Create your account"}
          </h2>
          <p className="auth-modal__sub">
            {mode === "login"
              ? "Welcome back, pick up right where you left off."
              : "Takes less than 30 seconds. No credit card required."}
          </p>

          <div className="auth-modal__oauth">
            <button
              type="button"
              className="btn btn--outline btn--block auth-modal__discord"
              disabled={submitting}
              onClick={() => startOAuth("discord")}
            >
              <i className="fa-brands fa-discord" aria-hidden="true" />
              Continue with Discord
            </button>
            <button
              type="button"
              className="btn btn--outline btn--block"
              disabled={submitting}
              onClick={() => startOAuth("google")}
            >
              <i className="fa-brands fa-google" aria-hidden="true" />
              Continue with Google
            </button>
          </div>

          <div className="auth-modal__divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {mode === "signup" && (
              <div className="form-row">
                <label htmlFor="auth-username">Username</label>
                <input id="auth-username" name="auth-username" type="text" placeholder="Your in-game name" />
              </div>
            )}
            <div className="form-row">
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" name="auth-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="form-row">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-modal__password-field">
                <input
                  id="auth-password"
                  name="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="auth-modal__password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {mode === "login" && (
              <label className="auth-modal__remember">
                <input type="checkbox" id="auth-remember" name="auth-remember" defaultChecked />
                Remember me
              </label>
            )}

            {formError && (
              <p className="form-row__error">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {formError}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
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
