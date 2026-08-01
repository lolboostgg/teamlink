"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { DASHBOARD_ROLES, type DashboardRole } from "@/lib/roles";

const SECTIONS: Record<DashboardRole, { href: string; label: string; icon: string }[]> = {
  client: [
    { href: "/dashboard/client", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/client/orders", label: "Orders", icon: "fa-solid fa-calendar-check" },
    { href: "/dashboard/client/chat", label: "Chat", icon: "fa-solid fa-comments" },
    { href: "/dashboard/client/favorites", label: "Favorites", icon: "fa-solid fa-heart" },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/admin/signups", label: "Signups", icon: "fa-solid fa-users" },
    { href: "/dashboard/admin/payouts", label: "Payouts & disputes", icon: "fa-solid fa-sack-dollar" },
  ],
  teammate: [
    { href: "/dashboard/teammate", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/teammate/sessions", label: "Sessions", icon: "fa-solid fa-calendar-check" },
    { href: "/dashboard/teammate/chat", label: "Chat", icon: "fa-solid fa-comments" },
    { href: "/dashboard/teammate/reviews", label: "Reviews", icon: "fa-solid fa-star" },
  ],
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const role: DashboardRole =
    DASHBOARD_ROLES.find((r) => pathname.startsWith(r.href))?.role ?? "client";
  const sections = SECTIONS[role];

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar__brand">
        <Logo />
      </div>

      <nav className="dashboard-sidebar__nav" aria-label="Dashboard sections">
        {sections.map((s) => {
          const isOverview = s.href === `/dashboard/${role}`;
          const active = isOverview ? pathname === s.href : pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`dashboard-sidebar__nav-link${active ? " is-active" : ""}`}
            >
              <i className={s.icon} aria-hidden="true" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      <Link href="/" className="dashboard-sidebar__back" transitionTypes={["dashboard-exit"]}>
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Back to site
      </Link>
    </aside>
  );
}
