"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { redeemInvite } from "@/app/join/[token]/actions";

export function JoinForm({ token, presetEmail }: { token: string; presetEmail: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await redeemInvite(token, { name, email, password });
      if (!result.ok) {
        setError(result.error ?? "Couldn't create your account.");
        return;
      }
      // Straight into the checklist — asking someone to log in again right
      // after choosing their password is pure friction.
      const signedIn = await signIn("credentials", {
        email,
        password,
        remember: "true",
        redirect: false,
      });
      if (signedIn?.error) {
        setError("Account created — please sign in.");
        router.push("/");
        return;
      }
      router.push("/dashboard/teammate/onboarding");
      router.refresh();
    });
  }

  return (
    <form className="join-form" onSubmit={submit}>
      <div className="form-row">
        <label htmlFor="join-name">Display name</label>
        <input
          id="join-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="How clients will see you"
          autoComplete="nickname"
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="join-email">Email</label>
        <input
          id="join-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="join-password">Password</label>
        <div className="join-form__password">
          <input
            id="join-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <i className={showPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye"} aria-hidden="true" />
          </button>
        </div>
        <small className="form-row__note">Use at least 8 characters.</small>
      </div>

      {error && (
        <p className="form-row__error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <button type="submit" className="btn btn--vivid join-form__submit" disabled={pending}>
        {pending ? "Creating your account…" : "Create my teammate account"}
      </button>
    </form>
  );
}
