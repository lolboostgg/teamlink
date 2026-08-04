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

// Maps the real account role (User.role in prisma/schema.prisma — CLIENT /
// TEAMMATE / ADMIN) to that account's own dashboard — used to send anyone
// who lands on a dashboard route that isn't theirs back to the one that is,
// instead of a 3-way demo switcher anyone could click through.
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
