"use client";

import { useNotifications } from "@/components/dashboard/NotificationProvider";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import { useHeaderDropdown } from "@/lib/useHeaderDropdown";

export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const { open, rootRef, rootProps, triggerProps } = useHeaderDropdown();

  return (
    <div className="dropdown-switcher" ref={rootRef} {...rootProps}>
      <button type="button" className="notification-bell" aria-label="Notifications" {...triggerProps}>
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
