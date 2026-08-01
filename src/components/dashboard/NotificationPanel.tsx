import { PriceTag } from "@/components/currency/PriceTag";
import type { BookingRequestNotification } from "@/lib/dashboard/notifications";
import { useNotifications } from "@/components/dashboard/NotificationProvider";

function timeAgo(ts: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function NotificationPanel({ notifications }: { notifications: BookingRequestNotification[] }) {
  const { accept, decline } = useNotifications();

  if (notifications.length === 0) {
    return (
      <div className="notification-panel">
        <div className="notification-panel__empty">
          <i className="fa-solid fa-bell-slash" aria-hidden="true" />
          No notifications yet — new booking requests will show up here.
        </div>
      </div>
    );
  }

  return (
    <div className="notification-panel">
      {notifications.map((n) => (
        <div className="notification-panel__item" key={n.id}>
          <div className="notification-panel__icon">
            <i className="fa-solid fa-bolt" aria-hidden="true" />
          </div>
          <div className="notification-panel__body">
            <div className="notification-panel__title">
              {n.clientName} wants to book {n.gameName}
            </div>
            <div className="notification-panel__meta">
              {n.option} · <PriceTag amountEUR={n.priceEUR} /> · {timeAgo(n.createdAt)}
            </div>
            {n.status === "pending" ? (
              <div className="notification-panel__actions">
                <button type="button" className="btn btn--sm btn--vivid" onClick={() => accept(n.id)}>
                  Accept
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => decline(n.id)}>
                  Decline
                </button>
              </div>
            ) : (
              <span className={`dashboard-pill ${n.status === "accepted" ? "dashboard-pill--success" : "dashboard-pill--muted"}`}>
                {n.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
