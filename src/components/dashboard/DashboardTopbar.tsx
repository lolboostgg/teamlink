"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/language/LanguageSwitcher";
import { DASHBOARD_ROLES } from "@/lib/roles";

export function DashboardTopbar() {
  const pathname = usePathname();
  const roleMeta = DASHBOARD_ROLES.find((r) => pathname.startsWith(r.href)) ?? DASHBOARD_ROLES[0];
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

  return (
    <header className="dashboard-topbar">
      <div>
        <span className="dashboard-topbar__eyebrow">Dashboard</span>
        <h1 className="dashboard-topbar__title">{roleMeta.label} overview</h1>
      </div>

      <div className="dashboard-topbar__actions">
        <CurrencySwitcher />
        <LanguageSwitcher />

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
              <button
                type="button"
                className="dropdown-switcher__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
