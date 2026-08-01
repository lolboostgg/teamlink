"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { DASHBOARD_ROLES, type DashboardRole } from "@/lib/roles";

// Sidebar links are in-page anchors on the current role's single overview
// page, not real sub-routes — each dashboard is one page (stat cards + a
// couple of tables/lists), kept deliberately scoped so this is shippable.
const SECTIONS: Record<DashboardRole, { id: string; label: string; icon: string }[]> = {
  client: [
    { id: "overview", label: "Overview", icon: "fa-solid fa-gauge" },
    { id: "bookings", label: "Bookings", icon: "fa-solid fa-calendar-check" },
    { id: "favorites", label: "Favorites", icon: "fa-solid fa-heart" },
  ],
  admin: [
    { id: "overview", label: "Overview", icon: "fa-solid fa-gauge" },
    { id: "signups", label: "Signups", icon: "fa-solid fa-users" },
    { id: "payouts", label: "Payouts & disputes", icon: "fa-solid fa-sack-dollar" },
  ],
  teammate: [
    { id: "overview", label: "Overview", icon: "fa-solid fa-gauge" },
    { id: "sessions", label: "Sessions", icon: "fa-solid fa-calendar-check" },
    { id: "reviews", label: "Reviews", icon: "fa-solid fa-star" },
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
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="dashboard-sidebar__nav-link">
            <i className={s.icon} aria-hidden="true" />
            {s.label}
          </a>
        ))}
      </nav>

      <Link href="/" className="dashboard-sidebar__back" transitionTypes={["dashboard-exit"]}>
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Back to site
      </Link>
    </aside>
  );
}
