"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { dashboardHrefForRole, profileHrefForRole } from "@/lib/roles";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useLanguage } from "@/components/language/LanguageProvider";
import { useHeaderDropdown } from "@/lib/useHeaderDropdown";

const DEFAULT_AVATAR = "/avatars/default.webp";

// Same hover/click dropdown pattern as SettingsTrigger — literally the same
// one now, from useHeaderDropdown, which also keeps this from being open at
// the same time as the settings, credits or notification panels. Every account now
// has exactly one real dashboard (see dashboardHrefForRole) instead of the
// old 3-way demo switcher anyone could click through regardless of role.
// Trigger is a small avatar-initials circle rather than a "Dashboard" text
// button — the dropdown itself carries the dashboard/profile/logout links.
export function DashboardTrigger() {
  const { data: session } = useSession();
  const { logout } = useAuthModal();
  const { p, t } = useLanguage();
  const router = useRouter();
  const { open, rootRef, rootProps, triggerProps, close } = useHeaderDropdown();
  const href = dashboardHrefForRole(session?.user?.role);
  const profileHref = profileHrefForRole(session?.user?.role);
  const role = session?.user?.role ?? "CLIENT";
  const roleLabel = role === "TEAMMATE" ? t("role.teammate") : role === "ADMIN" ? t("role.admin") : t("role.client");
  const roleLinks = role === "ADMIN"
    ? [
        ["/dashboard/admin/orders", "fa-solid fa-receipt", "Orders & sessions"],
        ["/dashboard/admin/chat", "fa-solid fa-comments", "Chat overview"],
        ["/dashboard/admin/users", "fa-solid fa-users", "Manage users"],
        ["/dashboard/admin/teammates", "fa-solid fa-user-group", "Manage teammates"],
      ]
    : role === "TEAMMATE"
      ? [
          ["/dashboard/teammate/sessions", "fa-solid fa-gamepad", "My sessions"],
          ["/dashboard/teammate/reviews", "fa-solid fa-star", "My reviews"],
          ["/dashboard/teammate/connections", "fa-solid fa-link", "Connections"],
        ]
      : [
          ["/dashboard/client/orders", "fa-solid fa-receipt", "My orders"],
          ["/dashboard/client/favorites", "fa-solid fa-heart", "Favorites"],
          ["/dashboard/client/wallet", "fa-solid fa-wallet", "Credits & wallet"],
        ];
  // The client dashboard lives inside this same marketing shell now (see
  // (marketing)/dashboard/client/layout.tsx) — only admin/teammate still
  // swap into the separate dashboard shell, so only they get the transition.
  const transitionTypes: string[] | undefined =
    session?.user?.role === "CLIENT" ? undefined : ["dashboard-enter"];

  function handleLogout() {
    close();
    logout();
    router.push("/");
  }

  return (
    <div className="dropdown-switcher header-utilities__dashboard" ref={rootRef} {...rootProps}>
      <button
        type="button"
        className="profile-account-trigger"
        aria-label={p("Account menu")}
        {...triggerProps}
      >
        <span className="profile-account-trigger__avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={session?.user?.image || DEFAULT_AVATAR} alt="" />
        </span>
        <span className="profile-account-trigger__meta">
          <strong>{session?.user?.name || p("Account")}</strong>
          <small>{roleLabel}</small>
        </span>
        <i className="fa-solid fa-chevron-down profile-account-trigger__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-switcher__menu dropdown-switcher__menu--right dropdown-switcher__menu--account account-dropdown" role="menu">
          <div className="dropdown-switcher__account">
            <span className="dropdown-switcher__account-avatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={session?.user?.image || DEFAULT_AVATAR} alt="" />
            </span>
            <span className="dropdown-switcher__account-copy">
              <span className="dropdown-switcher__account-name-row"><span className="dropdown-switcher__account-name">{session?.user?.name || "Account"}</span><span className={`dropdown-switcher__role dropdown-switcher__role--${role.toLowerCase()}`}>{roleLabel}</span></span>
              <span className="dropdown-switcher__account-email">{session?.user?.email}</span>
            </span>
          </div>
          {profileHref && (
            <Link href={profileHref} className="dropdown-switcher__item" role="menuitem" onClick={close}>
              <i className="fa-solid fa-id-card" aria-hidden="true" />
              <span>{p("My profile")}</span>
            </Link>
          )}
          <Link
            href={href}
            className="dropdown-switcher__item"
            role="menuitem"
            onClick={close}
            transitionTypes={transitionTypes}
          >
            <i className="fa-solid fa-gauge" aria-hidden="true" />
            <span>{p("Go to dashboard")}</span>
          </Link>
          <div className="account-dropdown__section-label">{p("Quick access")}</div>
          {roleLinks.map(([linkHref, icon, label]) => (
            <Link key={linkHref} href={linkHref} className="dropdown-switcher__item" role="menuitem" onClick={close}>
              <i className={icon} aria-hidden="true" />
              <span>{p(label)}</span>
            </Link>
          ))}
          <div className="account-dropdown__divider" />
          <button type="button" className="dropdown-switcher__item" role="menuitem" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>{p("Log out")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
