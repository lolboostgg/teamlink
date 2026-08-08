"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { TeammateSidebarProfile, type TeammateSidebarData } from "@/components/dashboard/teammate/TeammateSidebarProfile";

// Client dashboard has its own tab strip instead (see
// ClientDashboardNav.tsx) — it no longer uses this shell/sidebar at all.
type ShellRole = "admin" | "teammate";

const ONBOARDING_HREF = "/dashboard/teammate/onboarding";
// Kept in step with ONBOARDING_ALLOWED_PATHS in lib/teammateOnboarding.ts —
// these are the pages the checklist itself links to.
const ONBOARDING_OPEN_PATHS = [
  ONBOARDING_HREF,
  "/dashboard/teammate/verification",
  "/dashboard/teammate/connections",
  "/dashboard/teammate/profile",
];

const SECTIONS: Record<ShellRole, { href: string; label: string; icon: string }[]> = {
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/admin/users", label: "Users", icon: "fa-solid fa-users" },
    { href: "/dashboard/admin/teammates", label: "Teammates", icon: "fa-solid fa-user-gear" },
    { href: "/dashboard/admin/orders", label: "Orders & sessions", icon: "fa-solid fa-receipt" },
    { href: "/dashboard/admin/chat", label: "Chats", icon: "fa-solid fa-comments" },
    { href: "/dashboard/admin/payouts", label: "Payouts & disputes", icon: "fa-solid fa-sack-dollar" },
    { href: "/dashboard/admin/transactions", label: "Transactions", icon: "fa-solid fa-receipt" },
    { href: "/dashboard/admin/onboarding", label: "Onboarding", icon: "fa-solid fa-user-plus" },
  ],
  teammate: [
    { href: "/dashboard/teammate", label: "Overview", icon: "fa-solid fa-gauge" },
    { href: "/dashboard/teammate/requests", label: "Open requests", icon: "fa-solid fa-inbox" },
    { href: "/dashboard/teammate/sessions", label: "Orders", icon: "fa-solid fa-receipt" },
    { href: "/dashboard/teammate/reviews", label: "Reviews", icon: "fa-solid fa-star" },
    { href: "/dashboard/teammate/payments", label: "Payments", icon: "fa-solid fa-wallet" },
    { href: "/dashboard/teammate/profile", label: "Game profile", icon: "fa-solid fa-id-card" },
    { href: "/dashboard/teammate/verification", label: "Verification & payouts", icon: "fa-solid fa-shield-halved" },
    { href: "/dashboard/teammate/connections", label: "Connections", icon: "fa-solid fa-link" },
  ],
};

export function DashboardSidebar({
  teammate,
  onboardingPending = false,
}: {
  teammate?: TeammateSidebarData | null;
  onboardingPending?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const role: ShellRole = pathname.startsWith("/dashboard/admin") ? "admin" : "teammate";
  const baseSections = SECTIONS[role];
  // While the checklist is open, the sidebar becomes the checklist plus the
  // three pages it sends you to. Everything else is rendered locked rather
  // than hidden, so it's obvious the panel exists and what unlocks it.
  const sections =
    role === "teammate" && onboardingPending
      ? [{ href: ONBOARDING_HREF, label: "Finish setup", icon: "fa-solid fa-list-check" }, ...baseSections]
      : baseSections;

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
          const locked =
            role === "teammate" && onboardingPending && !ONBOARDING_OPEN_PATHS.includes(s.href);

          if (locked) {
            return (
              <span
                key={s.href}
                className="dashboard-sidebar__nav-link is-locked"
                aria-disabled="true"
                title={collapsed ? `${s.label} — finish your setup first` : "Finish your setup first"}
              >
                <i className={s.icon} aria-hidden="true" />
                <span>{s.label}</span>
                <i className="fa-solid fa-lock dashboard-sidebar__lock" aria-hidden="true" />
              </span>
            );
          }

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
        {/* Support sat between two navigation links as a third piece of grey
            text, so the one thing someone looks for when stuck read as the
            least important item on the panel. */}
        {!collapsed && (
          <div className="sidebar-support">
            <span className="sidebar-support__status">
              <span className="sidebar-support__dot" aria-hidden="true" />
              All systems operational
            </span>
            <p className="sidebar-support__copy">Stuck on something? We usually reply within an hour.</p>
            <a href="mailto:support@teamlink.gg" className="sidebar-support__cta">
              <i className="fa-regular fa-life-ring" aria-hidden="true" /> Contact support
            </a>
          </div>
        )}
        {collapsed && (
          <a href="mailto:support@teamlink.gg" title="Contact support">
            <i className="fa-regular fa-life-ring" />
            <span>Contact support</span>
          </a>
        )}
        <Link
          href={role === "admin" ? "/dashboard/admin/profile" : "/dashboard/teammate/profile"}
          title={collapsed ? "My profile" : undefined}
        >
          <i className="fa-solid fa-user" />
          <span>My profile</span>
        </Link>
        <Link href="/" transitionTypes={["dashboard-exit"]} title={collapsed ? "Back to site" : undefined}><i className="fa-solid fa-arrow-left" /><span>Back to site</span></Link>
      </div>
    </aside>
  );
}
