import Link from "next/link";
import { useNotifications, type FeedNotification } from "@/components/dashboard/NotificationProvider";

function timeAgo(ts: number): string {
  const minutes = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * What each kind of event looks like.
 *
 * `tone` is the point of this table. The old one mapped six types to six
 * icons and sent everything else to a generic bell, all of them in the same
 * blue tile — so a payout landing, a refund owed and a session ending were
 * indistinguishable until you read them, and four of the same event in a row
 * read as one grey wall. Money is gold, something wrong is amber, something
 * finished is green, and the rest is the accent.
 *
 * Every type the app actually raises is listed; see notify/channels.ts for
 * the full set. An unlisted one still renders, on the default.
 */
const KINDS: Record<string, { icon: string; tone: string }> = {
  "dispatch.incoming": { icon: "fa-solid fa-bolt", tone: "accent" },
  "order.assigned": { icon: "fa-solid fa-circle-check", tone: "accent" },
  "order.completed": { icon: "fa-solid fa-flag-checkered", tone: "green" },
  "order.abandoned": { icon: "fa-solid fa-ghost", tone: "amber" },
  "order.cancel_requested": { icon: "fa-solid fa-circle-xmark", tone: "amber" },
  "order.refund_due": { icon: "fa-solid fa-rotate-left", tone: "gold" },
  "order.games_added": { icon: "fa-solid fa-plus", tone: "accent" },
  "order.unread": { icon: "fa-solid fa-comment-dots", tone: "accent" },
  "order.unread_escalated": { icon: "fa-solid fa-comment-dots", tone: "amber" },
  "order.reviewed": { icon: "fa-solid fa-star", tone: "gold" },
  "tip.received": { icon: "fa-solid fa-hand-holding-dollar", tone: "gold" },
  "payout.paid": { icon: "fa-solid fa-money-bill-transfer", tone: "green" },
  "payout.rejected": { icon: "fa-solid fa-triangle-exclamation", tone: "amber" },
  "payout.requested": { icon: "fa-solid fa-money-bill-transfer", tone: "accent" },
  "verification.submitted": { icon: "fa-solid fa-id-badge", tone: "accent" },
  "verification.approved": { icon: "fa-solid fa-shield-halved", tone: "green" },
  "verification.rejected": { icon: "fa-solid fa-triangle-exclamation", tone: "amber" },
  "teammate.joined": { icon: "fa-solid fa-user-plus", tone: "green" },
};

const DEFAULT_KIND = { icon: "fa-solid fa-bell", tone: "accent" };

export function NotificationPanel({ notifications }: { notifications: FeedNotification[] }) {
  const { accept, decline, markAllSeen, markSeen, unreadCount } = useNotifications();
  const visible = notifications.filter((notification) => !notification.read || notification.actionable);

  // Deliberately not grouped into Today / Earlier. Splitting the feed by age
  // means reading the clock while rendering, which this codebase treats as a
  // bug — the same list would group differently either side of midnight, and
  // the server's clock is not the browser's. Each row already carries its own
  // relative time, and the tone of its icon is what actually separates one
  // event from the next.

  return (
    <div className="notification-panel">
      <header className="notification-panel__head">
        <span>
          <i className="fa-solid fa-bell" aria-hidden="true" /> Notifications
          {unreadCount > 0 && <b>{unreadCount}</b>}
        </span>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllSeen}>
            <i className="fa-solid fa-check-double" aria-hidden="true" /> Mark all read
          </button>
        )}
      </header>

      <div className="notification-panel__scroll">
        {!visible.length && (
          <div className="notification-panel__empty">
            <i className="fa-solid fa-check-double" aria-hidden="true" />
            You&rsquo;re all caught up.
          </div>
        )}

        {visible.map((notification) => {
          const kind = KINDS[notification.type] ?? DEFAULT_KIND;
              const content = (
                <>
                  <div className={`notification-panel__icon notification-panel__icon--${kind.tone}`}>
                    <i className={kind.icon} aria-hidden="true" />
                  </div>
                  <div className="notification-panel__body">
                    <div className="notification-panel__title">{notification.title}</div>
                    {notification.body && <div className="notification-panel__description">{notification.body}</div>}
                    <time>{timeAgo(notification.createdAt)}</time>
                    {notification.actionable && (
                      <div className="notification-panel__actions">
                        <button className="btn btn--sm btn--vivid" onClick={() => accept(notification.id)}>
                          Accept
                        </button>
                        <button className="btn btn--sm btn--ghost" onClick={() => decline(notification.id)}>
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                  {!notification.read && !notification.actionable && (
                    <button
                      type="button"
                      className="notification-panel__read"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        markSeen(notification.id);
                      }}
                      aria-label={`Mark ${notification.title} as read`}
                      title="Mark as read"
                    >
                      <i className="fa-regular fa-circle-check" aria-hidden="true" />
                    </button>
                  )}
                </>
              );
              const className = `notification-panel__item${notification.read ? "" : " is-unread"}`;
              return notification.href && !notification.actionable ? (
                <Link className={className} key={notification.id} href={notification.href}>
                  {content}
                </Link>
              ) : (
                <div className={className} key={notification.id}>
                  {content}
                </div>
              );
        })}
      </div>
    </div>
  );
}
