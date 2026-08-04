import Link from "next/link";
import { useNotifications, type FeedNotification } from "@/components/dashboard/NotificationProvider";

function timeAgo(ts: number): string {
  const minutes = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ICONS: Record<string, string> = { "dispatch.incoming": "fa-solid fa-bolt", "order.assigned": "fa-solid fa-circle-check", "order.completed": "fa-solid fa-flag-checkered", "verification.submitted": "fa-solid fa-id-badge", "verification.approved": "fa-solid fa-shield-halved", "verification.rejected": "fa-solid fa-triangle-exclamation" };

export function NotificationPanel({ notifications }: { notifications: FeedNotification[] }) {
  const { accept, decline, markAllSeen, markSeen, unreadCount } = useNotifications();
  return <div className="notification-panel">
    <header className="notification-panel__head"><span><i className="fa-solid fa-bell" /> Notifications{unreadCount > 0 && <b>{unreadCount}</b>}</span>{unreadCount > 0 && <button type="button" onClick={markAllSeen}><i className="fa-solid fa-check-double" /> Mark all read</button>}</header>
    <div className="notification-panel__scroll">
      {!notifications.length && <div className="notification-panel__empty"><i className="fa-solid fa-bell-slash" />Nothing new right now.</div>}
      {notifications.map((notification) => {
        const content = <><div className="notification-panel__icon"><i className={ICONS[notification.type] ?? "fa-solid fa-bell"} /></div><div className="notification-panel__body"><div className="notification-panel__title">{notification.title}</div>{notification.body && <div className="notification-panel__description">{notification.body}</div>}<time>{timeAgo(notification.createdAt)}</time>{notification.actionable && <div className="notification-panel__actions"><button className="btn btn--sm btn--vivid" onClick={() => accept(notification.id)}>Accept</button><button className="btn btn--sm btn--ghost" onClick={() => decline(notification.id)}>Decline</button></div>}</div>{!notification.read && !notification.actionable && <button type="button" className="notification-panel__read" onClick={(event) => { event.preventDefault(); event.stopPropagation(); markSeen(notification.id); }} aria-label={`Mark ${notification.title} as read`} title="Mark as read"><i className="fa-regular fa-circle-check" /></button>}</>;
        const className = `notification-panel__item${notification.read ? "" : " is-unread"}`;
        return notification.href && !notification.actionable ? <Link className={className} key={notification.id} href={notification.href}>{content}</Link> : <div className={className} key={notification.id}>{content}</div>;
      })}
    </div>
  </div>;
}
