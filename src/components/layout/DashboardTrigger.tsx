"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { dashboardHrefForRole, profileHrefForRole } from "@/lib/roles";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

const CLOSE_DELAY_MS = 200;

const DEFAULT_AVATAR = "/avatars/default.webp";

// Same hover/click dropdown pattern as SettingsTrigger. Every account now
// has exactly one real dashboard (see dashboardHrefForRole) instead of the
// old 3-way demo switcher anyone could click through regardless of role.
// Trigger is a small avatar-initials circle rather than a "Dashboard" text
// button — the dropdown itself carries the dashboard/profile/logout links.
export function DashboardTrigger() {
  const { data: session } = useSession();
  const { logout } = useAuthModal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const href = dashboardHrefForRole(session?.user?.role);
  const profileHref = profileHrefForRole(session?.user?.role);
  // The client dashboard lives inside this same marketing shell now (see
  // (marketing)/dashboard/client/layout.tsx) — only admin/teammate still
  // swap into the separate dashboard shell, so only they get the transition.
  const transitionTypes: string[] | undefined =
    session?.user?.role === "CLIENT" ? undefined : ["dashboard-enter"];

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <div
      className="dropdown-switcher header-utilities__dashboard"
      ref={rootRef}
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="profile-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={session?.user?.image || DEFAULT_AVATAR} alt="" />
      </button>

      {open && (
        <div className="dropdown-switcher__menu dropdown-switcher__menu--right" role="menu">
          <div className="dropdown-switcher__account">
            <span className="dropdown-switcher__account-name">{session?.user?.name || "Account"}</span>
            <span className="dropdown-switcher__account-email">{session?.user?.email}</span>
          </div>
          {profileHref && (
            <Link href={profileHref} className="dropdown-switcher__item" role="menuitem" onClick={() => setOpen(false)}>
              <i className="fa-solid fa-id-card" aria-hidden="true" />
              <span>My profile</span>
            </Link>
          )}
          <Link
            href={href}
            className="dropdown-switcher__item"
            role="menuitem"
            onClick={() => setOpen(false)}
            transitionTypes={transitionTypes}
          >
            <i className="fa-solid fa-gauge" aria-hidden="true" />
            <span>Go to dashboard</span>
          </Link>
          <button type="button" className="dropdown-switcher__item" role="menuitem" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
