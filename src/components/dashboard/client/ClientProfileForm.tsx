"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateProfile, changePassword } from "@/app/(marketing)/dashboard/client/profile/actions";
import { useToast } from "@/components/ui/ToastProvider";
import { AvatarFrameEditor } from "@/components/ui/AvatarFrameEditor";

interface Props {
  initial: { name: string; email: string; avatarUrl: string; avatarFocusX: number; avatarFocusY: number; avatarZoom: number };
  /** Settings splits these across two sections; "both" keeps the old page. */
  section?: "both" | "profile" | "password";
}

export function ClientProfileForm({ initial, section = "both" }: Props) {
  const { showToast } = useToast();
  const { update: updateSession } = useSession();
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [avatar, setAvatar] = useState({
    avatarUrl: initial.avatarUrl,
    avatarFocusX: initial.avatarFocusX,
    avatarFocusY: initial.avatarFocusY,
    avatarZoom: initial.avatarZoom,
  });
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
        const result = await updateProfile({ name, ...avatar });
        // Failures come back as data — Next would strip the message off a
        // thrown one in production. See lib/actionError.ts.
        if (!result.ok) throw new Error(result.error);
        // Re-syncs the JWT so the header avatar/name reflect the change
        // immediately, without needing to log out and back in — see the
        // trigger:"update" branch in auth.ts's jwt() callback. Must pass
        // *some* payload: next-auth's update() only POSTs (the only path
        // that sets trigger:"update" server-side) when called with data —
        // update() with no arguments does a plain GET that re-reads the
        // unchanged session.
        await updateSession({});
        // The identity strip above this form (ProfileSection in
        // SettingsScreen.tsx) is a Server Component prop, not state — it
        // doesn't see this save at all unless the server render is redone.
        router.refresh();
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
        const result = await changePassword({ currentPassword, newPassword });
        if (!result.ok) throw new Error(result.error);
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
      {section !== "password" && (
      <form onSubmit={handleProfileSubmit}>
        <div className="form-row">
          <label htmlFor="cp-name">Display name</label>
          <input id="cp-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-row">
          <label htmlFor="cp-email">Email</label>
          <input id="cp-email" value={initial.email} disabled />
        </div>
        <AvatarFrameEditor value={avatar} onChange={setAvatar} allowZoom={false} />
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
      )}

      {section === "both" && <hr className="client-profile-form__divider" />}

      {section !== "profile" && (
      <form onSubmit={handlePasswordSubmit}>
        {section === "both" && <div className="client-profile-form__section-title"><strong>Password</strong><span>Update the password used for email login</span></div>}
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
      )}
    </div>
  );
}
