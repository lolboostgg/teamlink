"use client";

import { SettingsTrigger } from "@/components/layout/SettingsTrigger";
import { DashboardTrigger } from "@/components/layout/DashboardTrigger";
import { CreditsWidget } from "@/components/layout/CreditsWidget";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function HeaderUtilities() {
  const { isAuthenticated } = useAuthModal();

  return (
    <div className="header-utilities">
      <SettingsTrigger />
      {isAuthenticated && <CreditsWidget />}
      {isAuthenticated && <DashboardTrigger />}
    </div>
  );
}
