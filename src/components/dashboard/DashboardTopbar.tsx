"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { SettingsTrigger } from "@/components/layout/SettingsTrigger";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { SoundToggle } from "@/components/dashboard/SoundToggle";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { DASHBOARD_ROLES } from "@/lib/roles";
import { profileHrefForRole } from "@/lib/roles";
import { useSession } from "next-auth/react";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export function DashboardTopbar({ avatarUrl }: { avatarUrl?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthModal();
  const { data: session } = useSession();
  // This topbar only ever renders for admin/teammate now — client has its
  // own tab strip (see ClientDashboardNav.tsx) instead of this shell.
  const roleMeta =
    DASHBOARD_ROLES.find((r) => r.role !== "client" && pathname.startsWith(r.href)) ?? DASHBOARD_ROLES[1];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profileHref = profileHrefForRole(session?.user?.role);
  const initials = (session?.user?.name || roleMeta.label).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

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
        <SoundToggle />
        <NotificationBell />

        <div className="dropdown-switcher" ref={ref}>
          <button
            type="button"
            className="dashboard-account-trigger"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="dashboard-avatar">
              {avatarUrl || session?.user?.image ? (
                <SafeAvatarImage src={avatarUrl || session?.user?.image} />
              ) : (
                <span className="dashboard-avatar__initials">{initials}</span>
              )}
            </span>
            <span className="dashboard-account-trigger__meta"><strong>{session?.user?.name || roleMeta.label}</strong><small>{roleMeta.label}</small></span>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>

          {open && (
            <div className="dropdown-switcher__menu dropdown-switcher__menu--right account-dropdown" role="menu">
              <div className="dashboard-account-menu__identity">
                <div><strong>{session?.user?.name || roleMeta.label}</strong><small>{roleMeta.label}</small></div>
                <span>{session?.user?.email}</span>
              </div>
              {profileHref && <Link href={profileHref} className="dropdown-switcher__item" role="menuitem" onClick={() => setOpen(false)}><i className="fa-solid fa-id-card" aria-hidden="true" /> My profile</Link>}
              <Link href={roleMeta.href} className="dropdown-switcher__item" role="menuitem" onClick={() => setOpen(false)}><i className="fa-solid fa-gauge" aria-hidden="true" /> Dashboard overview</Link>
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
