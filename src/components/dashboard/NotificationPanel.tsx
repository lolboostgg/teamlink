import Link from "next/link";
import { useNotifications, type FeedNotification } from "@/components/dashboard/NotificationProvider";

function timeAgo(ts: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ICONS: Record<string, string> = {
  "dispatch.incoming": "fa-solid fa-bolt",
  "order.assigned": "fa-solid fa-circle-check",
  "order.completed": "fa-solid fa-flag-checkered",
  "verification.submitted": "fa-solid fa-id-badge",
  "verification.approved": "fa-solid fa-shield-halved",
  "verification.rejected": "fa-solid fa-triangle-exclamation",
};

export function NotificationPanel({ notifications }: { notifications: FeedNotification[] }) {
  const { accept, decline } = useNotifications();

  if (notifications.length === 0) {
    return (
      <div className="notification-panel">
        <div className="notification-panel__empty">
          <i className="fa-solid fa-bell-slash" aria-hidden="true" />
          Nothing yet — requests and account updates land here.
        </div>
      </div>
    );
  }

  return (
    <div className="notification-panel">
      {notifications.map((n) => {
        const body = (
          <>
            <div className="notification-panel__icon">
              <i className={ICONS[n.type] ?? "fa-solid fa-bell"} aria-hidden="true" />
            </div>
            <div className="notification-panel__body">
              <div className="notification-panel__title">{n.title}</div>
              <div className="notification-panel__meta">
                {n.body ? `${n.body} · ` : ""}
                {timeAgo(n.createdAt)}
              </div>
              {n.actionable && (
                <div className="notification-panel__actions">
                  <button type="button" className="btn btn--sm btn--vivid" onClick={() => accept(n.id)}>
                    Accept
                  </button>
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => decline(n.id)}>
                    Decline
                  </button>
                </div>
              )}
            </div>
          </>
        );

        const className = `notification-panel__item${n.read ? "" : " is-unread"}`;

        return n.href && !n.actionable ? (
          <Link className={className} key={n.id} href={n.href}>
            {body}
          </Link>
        ) : (
          <div className={className} key={n.id}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
