"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

// Client dashboard has its own tab strip instead (see
// ClientDashboardNav.tsx) — it no longer uses this shell/sidebar at all.
type ShellRole = "admin" | "teammate";

const SECTIONS: Record<ShellRole, { href: string; label: string; icon: string }[]> = {
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/admin/users", label: "Users", icon: "fa-solid fa-users" },
    { href: "/dashboard/admin/teammates", label: "Teammates", icon: "fa-solid fa-user-gear" },
    { href: "/dashboard/admin/payouts", label: "Payouts & disputes", icon: "fa-solid fa-sack-dollar" },
  ],
  teammate: [
    { href: "/dashboard/teammate", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/teammate/sessions", label: "Sessions", icon: "fa-solid fa-calendar-check" },
    { href: "/dashboard/teammate/chat", label: "Chat", icon: "fa-solid fa-comments" },
    { href: "/dashboard/teammate/reviews", label: "Reviews", icon: "fa-solid fa-star" },
    { href: "/dashboard/teammate/profile", label: "Game profile", icon: "fa-solid fa-id-card" },
    { href: "/dashboard/teammate/verification", label: "Verification & payouts", icon: "fa-solid fa-shield-halved" },
    { href: "/dashboard/teammate/connections", label: "Connections", icon: "fa-solid fa-link" },
  ],
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const role: ShellRole = pathname.startsWith("/dashboard/admin") ? "admin" : "teammate";
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
