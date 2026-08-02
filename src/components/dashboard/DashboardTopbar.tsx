"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { SettingsTrigger } from "@/components/layout/SettingsTrigger";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { DASHBOARD_ROLES } from "@/lib/roles";

export function DashboardTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthModal();
  // This topbar only ever renders for admin/teammate now — client has its
  // own tab strip (see ClientDashboardNav.tsx) instead of this shell.
  const roleMeta =
    DASHBOARD_ROLES.find((r) => r.role !== "client" && pathname.startsWith(r.href)) ?? DASHBOARD_ROLES[1];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <header className="dashboard-topbar">
      <div>
        <span className="dashboard-topbar__eyebrow">Dashboard</span>
        <h1 className="dashboard-topbar__title">{roleMeta.label} overview</h1>
      </div>

      <div className="dashboard-topbar__actions">
        <SettingsTrigger />
        <NotificationBell />

        <div className="dropdown-switcher" ref={ref}>
          <button
            type="button"
            className="dashboard-avatar"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="dashboard-avatar__initials">{roleMeta.label.slice(0, 2).toUpperCase()}</span>
          </button>

          {open && (
            <div className="dropdown-switcher__menu dropdown-switcher__menu--right" role="menu">
              <Link
                href="/"
                className="dropdown-switcher__item"
                role="menuitem"
                transitionTypes={["dashboard-exit"]}
                onClick={() => setOpen(false)}
              >
                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to site
              </Link>
              <button type="button" className="dropdown-switcher__item" role="menuitem" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
