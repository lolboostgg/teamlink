"use client";

import { TeammateProfileForm, type TeammateProfileFormValue } from "@/components/dashboard/TeammateProfileForm";
import { updateOwnProfile } from "@/app/dashboard/teammate/profile/actions";
import { useToast } from "@/components/ui/ToastProvider";

export function TeammateProfileEditor({ initial }: { initial: TeammateProfileFormValue }) {
  const { showToast } = useToast();

  return (
    <TeammateProfileForm
      initial={initial}
      showAdminFields={false}
      onSave={async (value) => {
        await updateOwnProfile(value);
        showToast("Profile updated.", "success");
      }}
    />
  );
}
