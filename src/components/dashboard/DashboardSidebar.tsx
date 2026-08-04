"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { TeammateSidebarProfile, type TeammateSidebarData } from "@/components/dashboard/teammate/TeammateSidebarProfile";

// Client dashboard has its own tab strip instead (see
// ClientDashboardNav.tsx) — it no longer uses this shell/sidebar at all.
type ShellRole = "admin" | "teammate";

const SECTIONS: Record<ShellRole, { href: string; label: string; icon: string }[]> = {
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/admin/users", label: "Users", icon: "fa-solid fa-users" },
    { href: "/dashboard/admin/teammates", label: "Teammates", icon: "fa-solid fa-user-gear" },
    { href: "/dashboard/admin/orders", label: "Orders & sessions", icon: "fa-solid fa-receipt" },
    { href: "/dashboard/admin/chat", label: "Chats", icon: "fa-solid fa-comments" },
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

export function DashboardSidebar({ teammate }: { teammate?: TeammateSidebarData | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const role: ShellRole = pathname.startsWith("/dashboard/admin") ? "admin" : "teammate";
  const sections = SECTIONS[role];

  useEffect(() => setCollapsed(window.localStorage.getItem("teamlink:dashboard-sidebar-collapsed") === "true"), []);
  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("teamlink:dashboard-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <aside className={`dashboard-sidebar${collapsed ? " is-collapsed" : ""}`}>
      <div className="dashboard-sidebar__brand">
        <Logo withWordmark={!collapsed} />
        <button type="button" className="dashboard-sidebar__collapse" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}><i className={`fa-solid ${collapsed ? "fa-angles-right" : "fa-angles-left"}`} /></button>
      </div>

      {role === "teammate" && teammate && <TeammateSidebarProfile teammate={teammate} />}

      <nav className="dashboard-sidebar__nav" aria-label="Dashboard sections">
        {sections.map((s) => {
          const isOverview = s.href === `/dashboard/${role}`;
          const active = isOverview ? pathname === s.href : pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`dashboard-sidebar__nav-link${active ? " is-active" : ""}`}
              title={collapsed ? s.label : undefined}
            >
              <i className={s.icon} aria-hidden="true" />
              <span>{s.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dashboard-sidebar__utility">
        {role === "teammate" && <Link href="/dashboard/teammate/profile" title={collapsed ? "My profile" : undefined}><i className="fa-solid fa-user" /><span>My profile</span></Link>}
        <a href="mailto:support@teamlink.gg" title={collapsed ? "Help & support" : undefined}><i className="fa-regular fa-circle-question" /><span>Help & support</span></a>
        <Link href="/" transitionTypes={["dashboard-exit"]} title={collapsed ? "Back to site" : undefined}><i className="fa-solid fa-arrow-left" /><span>Back to site</span></Link>
      </div>
    </aside>
  );
}
