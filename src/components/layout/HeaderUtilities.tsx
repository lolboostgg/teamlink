"use client";

import { SettingsTrigger } from "@/components/layout/SettingsTrigger";
import { DashboardTrigger } from "@/components/layout/DashboardTrigger";
import { CreditsWidget } from "@/components/layout/CreditsWidget";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useSession } from "next-auth/react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

export function HeaderUtilities() {
  const { isAuthenticated } = useAuthModal();
  const { data: session } = useSession();

  return (
    <div className="header-utilities">
      <SettingsTrigger />
      {isAuthenticated && session?.user?.role === "CLIENT" && <CreditsWidget />}
      {isAuthenticated && session?.user?.role === "CLIENT" && <NotificationBell />}
      {isAuthenticated && <DashboardTrigger />}
    </div>
  );
}
