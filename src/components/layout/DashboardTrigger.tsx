"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { dashboardHrefForRole } from "@/lib/roles";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

const CLOSE_DELAY_MS = 200;

// Same hover/click dropdown pattern as SettingsTrigger. Every account now
// has exactly one real dashboard (see dashboardHrefForRole) instead of the
// old 3-way demo switcher anyone could click through regardless of role.
export function DashboardTrigger() {
  const { data: session } = useSession();
  const { logout } = useAuthModal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const href = dashboardHrefForRole(session?.user?.role);
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
        className="btn btn--outline btn--sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <i className="fa-solid fa-gauge" aria-hidden="true" />
        Dashboard
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-switcher__menu dropdown-switcher__menu--right" role="menu">
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
