"use client";

import { useSession } from "next-auth/react";
import { TeammateProfileForm, type TeammateProfileFormValue } from "@/components/dashboard/TeammateProfileForm";
import { updateOwnProfile } from "@/app/dashboard/teammate/profile/actions";
import { useToast } from "@/components/ui/ToastProvider";

export function TeammateProfileEditor({ initial }: { initial: TeammateProfileFormValue }) {
  const { showToast } = useToast();
  const { update: updateSession } = useSession();

  return (
    <TeammateProfileForm
      initial={initial}
      showAdminFields={false}
      onSave={async (value) => {
        await updateOwnProfile(value);
        // Re-syncs the JWT so the header avatar reflects the game-profile
        // picture immediately — see trigger:"update" in auth.ts's jwt().
        // Must pass *some* payload: update() with no args does a plain GET
        // (doesn't set trigger:"update" server-side) — see the longer note
        // in ClientProfileForm.tsx.
        await updateSession({});
        showToast("Profile updated.", "success");
      }}
    />
  );
}
