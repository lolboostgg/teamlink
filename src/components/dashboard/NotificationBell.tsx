"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/components/dashboard/NotificationProvider";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";

export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="dropdown-switcher" ref={ref}>
      <button
        type="button"
        className="notification-bell"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notifications"
      >
        <i className="fa-solid fa-bell" aria-hidden="true" />
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="dropdown-switcher__menu dropdown-switcher__menu--right notification-bell__menu">
          <NotificationPanel notifications={notifications} />
        </div>
      )}
    </div>
  );
}
