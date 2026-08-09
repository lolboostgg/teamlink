export type DashboardRole = "client" | "admin" | "teammate";

export interface DashboardRoleMeta {
  role: DashboardRole;
  label: string;
  href: string;
  icon: string;
}

export const DASHBOARD_ROLES: DashboardRoleMeta[] = [
  { role: "client", label: "Client", href: "/dashboard/client", icon: "fa-solid fa-user" },
  { role: "admin", label: "Admin", href: "/dashboard/admin", icon: "fa-solid fa-shield-halved" },
  { role: "teammate", label: "Teammate", href: "/dashboard/teammate", icon: "fa-solid fa-gamepad" },
];

const ROLE_BY_KEY = new Map(DASHBOARD_ROLES.map((r) => [r.role, r]));

export function getRoleMeta(role: DashboardRole): DashboardRoleMeta {
  return ROLE_BY_KEY.get(role) ?? DASHBOARD_ROLES[0];
}

/**
 * Every dashboard this account may open, in the order they should be offered.
 *
 * One person is often several things here — an admin who also takes orders, a
 * teammate who books their own duo — and the account they sign in with is the
 * same one either way. Until now the role picked exactly one dashboard and
 * bounced them out of the other two, which meant a teammate could not see
 * their own bookings and an admin could not look at the product they run.
 *
 * It is a widening, not a free-for-all: nothing here lets a client reach the
 * admin panel. An account gets its own dashboard plus the ones strictly below
 * it, and the teammate dashboard only if a Teammate row actually exists —
 * without one, that dashboard has nothing to show and every panel on it would
 * be reading a profile that was never created.
 */
export function accessibleDashboards(
  role: string | undefined | null,
  hasTeammateProfile: boolean,
): DashboardRoleMeta[] {
  const keys: DashboardRole[] =
    role === "ADMIN"
      ? ["admin", "teammate", "client"]
      : role === "TEAMMATE"
        ? ["teammate", "client"]
        : ["client"];

  return keys
    .filter((key) => key !== "teammate" || hasTeammateProfile)
    .map((key) => getRoleMeta(key));
}

/** Whether this account may open a particular dashboard at all. */
export function canOpenDashboard(
  role: string | undefined | null,
  hasTeammateProfile: boolean,
  target: DashboardRole,
): boolean {
  return accessibleDashboards(role, hasTeammateProfile).some((entry) => entry.role === target);
}

// Maps the real account role (User.role in prisma/schema.prisma — CLIENT /
// TEAMMATE / ADMIN) to that account's own dashboard — where a sign-in lands
// and where anyone who asks for a dashboard they may not open is sent.
export function dashboardHrefForRole(role: string | undefined | null): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "TEAMMATE":
      return "/dashboard/teammate";
    default:
      return "/dashboard/client";
  }
}

// Where the header profile menu's "My profile" item links to — admin
// accounts have no personal profile page yet (their dashboard is the
// platform, not a personal presence), so this returns null and the menu
// item is omitted for them.
export function profileHrefForRole(role: string | undefined | null): string | null {
  switch (role) {
    case "TEAMMATE":
      return "/dashboard/teammate/profile";
    case "CLIENT":
      return "/dashboard/client/profile";
    case "ADMIN":
      return "/dashboard/admin/profile";
    default:
      return null;
  }
}
