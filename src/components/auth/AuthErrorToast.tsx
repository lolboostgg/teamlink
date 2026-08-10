"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Turns the `?authError=` / `?error=` NextAuth leaves on the URL after a
 * failed OAuth round-trip into a readable toast, then strips it so a refresh
 * doesn't replay it.
 *
 * Reads location directly instead of useSearchParams(): this sits in the root
 * layout, and useSearchParams() there would force every page into dynamic
 * rendering (or need a Suspense boundary around the whole app).
 */
const MESSAGES: Record<string, string> = {
  no_email: "That account has no email address we can use — add one at the provider, or sign up with email instead.",
  unverified_email: "Please verify your email address with the provider first, then try again.",
  admin_credentials_required: "Admin accounts must sign in with email, password and their authenticator code.",
  OAuthSignin: "Couldn't start the sign-in. Please try again.",
  OAuthCallback: "The provider rejected the sign-in. Please try again.",
  OAuthAccountNotLinked: "That email already has an account here — sign in the way you created it.",
  AccessDenied: "Sign-in was cancelled.",
  Configuration: "Sign-in isn't configured correctly on our side. We're on it.",
  Verification: "That sign-in link expired. Please try again.",
};

export function AuthErrorToast() {
  const { showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("authError") ?? params.get("error");
    if (!code) return;

    showToast(MESSAGES[code] ?? "Sign-in failed. Please try again.", "error");

    params.delete("authError");
    params.delete("error");
    const query = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
  }, [showToast]);

  return null;
}
