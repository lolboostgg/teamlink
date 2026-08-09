"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { SidebarAccountMenu } from "@/components/dashboard/SidebarAccountMenu";
import { TeammateSidebarProfile, type TeammateSidebarData } from "@/components/dashboard/teammate/TeammateSidebarProfile";
import type { DashboardRoleMeta } from "@/lib/roles";

// Client dashboard has its own tab strip instead (see
// ClientDashboardNav.tsx) — it no longer uses this shell/sidebar at all.
type ShellRole = "admin" | "teammate";

const COLLAPSED_KEY = "qup:dashboard-sidebar-collapsed";

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
    { href: "/dashboard/admin/dispatch", label: "Live dispatch", icon: "fa-solid fa-satellite-dish" },
    { href: "/dashboard/admin/orders", label: "Orders & sessions", icon: "fa-solid fa-receipt" },
    { href: "/dashboard/admin/chat", label: "Chats", icon: "fa-solid fa-comments" },
    { href: "/dashboard/admin/payouts", label: "Payouts & disputes", icon: "fa-solid fa-sack-dollar" },
    { href: "/dashboard/admin/transactions", label: "Transactions", icon: "fa-solid fa-receipt" },
    { href: "/dashboard/admin/applications", label: "Applications", icon: "fa-solid fa-inbox" },
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
  accountName = null,
  accountAvatarUrl = null,
  onboardingPending = false,
  dashboards = [],
}: {
  teammate?: TeammateSidebarData | null;
  /** The signed-in account itself — an admin or client has no teammate row. */
  accountName?: string | null;
  accountAvatarUrl?: string | null;
  onboardingPending?: boolean;
  /** Every dashboard this account may open — see lib/roles.ts. */
  dashboards?: DashboardRoleMeta[];
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

  // Starts expanded and corrects on mount: localStorage does not exist during
  // the server render, and guessing wrong there is a hydration mismatch on
  // every load. The storage listener carries the choice between tabs, which is
  // the whole point of persisting it in the first place.
  useEffect(() => {
    const sync = () => setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "true");
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSED_KEY, String(next));
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
        {/* One control instead of a support card, a profile link and a
            back-to-site link stacked in the same corner, each reading as the
            least important thing on the panel. It opens upward: it sits at the
            bottom of the screen, and a menu opening downward falls off it. */}
        <SidebarAccountMenu
          name={teammate?.name ?? accountName ?? (role === "admin" ? "Admin" : "Account")}
          role={role === "admin" ? "Admin" : "Teammate"}
          // An admin has no teammate row, so theirs comes off the account.
          avatarUrl={teammate?.avatarUrl ?? accountAvatarUrl ?? null}
          balanceEUR={teammate ? teammate.balanceEUR : null}
          profileHref={role === "admin" ? "/dashboard/admin/profile" : "/dashboard/teammate/profile"}
          collapsed={collapsed}
          dashboards={dashboards}
          currentDashboard={role}
        />
      </div>
    </aside>
  );
}
