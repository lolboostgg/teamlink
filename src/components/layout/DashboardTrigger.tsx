"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DASHBOARD_ROLES } from "@/lib/roles";
import { useRole } from "@/components/role/RoleProvider";

const CLOSE_DELAY_MS = 200;

// Same hover/click dropdown pattern as SettingsTrigger — replaces the old
// always-visible floating "Demo dashboard" pill. There's no real auth here,
// so this is how visitors reach the 3 demo dashboards: hover/click the
// header's Dashboard button to pick which one.
export function DashboardTrigger() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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
          {DASHBOARD_ROLES.map((r) => (
            <Link
              key={r.role}
              href={r.href}
              className={`dropdown-switcher__item${role === r.role ? " is-active" : ""}`}
              onClick={() => {
                setRole(r.role);
                setOpen(false);
              }}
              transitionTypes={["dashboard-enter"]}
            >
              <i className={r.icon} aria-hidden="true" />
              <span>{r.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
