"use client";

import { SettingsTrigger } from "@/components/layout/SettingsTrigger";
import { DashboardTrigger } from "@/components/layout/DashboardTrigger";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function HeaderUtilities() {
  const { isAuthenticated } = useAuthModal();

  return (
    <div className="header-utilities">
      <SettingsTrigger />
      {isAuthenticated && <DashboardTrigger />}
    </div>
  );
}
