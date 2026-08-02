"use client";

import { useState, useTransition } from "react";
import { updateProfile, changePassword } from "@/app/(marketing)/dashboard/client/profile/actions";
import { useToast } from "@/components/ui/ToastProvider";

interface Props {
  initial: { name: string; email: string; avatarUrl: string };
}

export function ClientProfileForm({ initial }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState(initial.name);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [profilePending, startProfileTransition] = useTransition();
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, startPasswordTransition] = useTransition();
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    startProfileTransition(async () => {
      try {
        await updateProfile({ name, avatarUrl });
        showToast("Profile updated.", "success");
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Couldn't save — try again.");
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    startPasswordTransition(async () => {
      try {
        await changePassword({ currentPassword, newPassword });
        setCurrentPassword("");
        setNewPassword("");
        showToast("Password changed.", "success");
      } catch (err) {
        setPasswordError(err instanceof Error ? err.message : "Couldn't change password — try again.");
      }
    });
  }

  return (
    <div className="client-profile-form">
      <form onSubmit={handleProfileSubmit}>
        <div className="form-row">
          <label htmlFor="cp-name">Display name</label>
          <input id="cp-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-row">
          <label htmlFor="cp-email">Email</label>
          <input id="cp-email" value={initial.email} disabled />
        </div>
        <div className="form-row">
          <label htmlFor="cp-avatar">Profile picture URL</label>
          <input id="cp-avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
        </div>
        {profileError && (
          <p className="form-row__error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {profileError}
          </p>
        )}
        <div className="teammate-profile-form__actions">
          <button type="submit" className="btn btn--vivid" disabled={profilePending}>
            {profilePending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      <hr className="client-profile-form__divider" />

      <form onSubmit={handlePasswordSubmit}>
        <div className="form-row-grid">
          <div className="form-row">
            <label htmlFor="cp-current-password">Current password</label>
            <input
              id="cp-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="cp-new-password">New password</label>
            <input
              id="cp-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>
        {passwordError && (
          <p className="form-row__error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {passwordError}
          </p>
        )}
        <div className="teammate-profile-form__actions">
          <button type="submit" className="btn btn--ghost" disabled={passwordPending}>
            {passwordPending ? "Changing..." : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}
