"use client";

import Link from "next/link";
import { SettingsTrigger } from "@/components/layout/SettingsTrigger";
import { useRole } from "@/components/role/RoleProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { getRoleMeta } from "@/lib/roles";

export function HeaderUtilities() {
  const { role } = useRole();
  const { isAuthenticated } = useAuthModal();
  const roleMeta = getRoleMeta(role);

  return (
    <div className="header-utilities">
      <SettingsTrigger />
      {isAuthenticated && (
        <Link
          href={roleMeta.href}
          className="btn btn--outline btn--sm header-utilities__dashboard"
          transitionTypes={["dashboard-enter"]}
        >
          <i className="fa-solid fa-gauge" aria-hidden="true" />
          Dashboard
        </Link>
      )}
    </div>
  );
}
