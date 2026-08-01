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
