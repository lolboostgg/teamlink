"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_ROLES } from "@/lib/roles";
import { useRole } from "@/components/role/RoleProvider";
import { Tooltip } from "@/components/ui/Tooltip";

// Polished, always-visible floating pill (unlike the dev-only, prod-gated
// PrototypeSwitcher this project used for its homepage design experiment —
// this is an intentional demo feature, not throwaway tooling, since there's
// no real auth to gate the 3 dashboards behind). Active state is derived
// from the URL, not the role context, so it stays correct if someone
// deep-links straight into a dashboard.
export function RoleSwitcher() {
  const pathname = usePathname();
  const { setRole } = useRole();
  const onDashboard = pathname.startsWith("/dashboard");

  return (
    <div className={`role-switcher${onDashboard ? " role-switcher--compact" : ""}`}>
      <span className="role-switcher__label">Demo dashboard</span>
      {DASHBOARD_ROLES.map((r) => (
        <Tooltip key={r.role} label={r.label}>
          <Link
            href={r.href}
            className={`role-switcher__item${pathname.startsWith(r.href) ? " is-active" : ""}`}
            onClick={() => setRole(r.role)}
            transitionTypes={pathname.startsWith("/dashboard") ? [] : ["dashboard-enter"]}
          >
            <i className={r.icon} aria-hidden="true" />
            <span>{r.label}</span>
          </Link>
        </Tooltip>
      ))}
    </div>
  );
}
