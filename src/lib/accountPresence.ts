/**
 * "Is this person around right now?" for any account.
 *
 * Deliberately separate from lib/dispatch/presence.ts, which answers a much
 * stricter question: whether a teammate's panel is open enough for the
 * dispatcher to send them an order. That one is fed by a 45-second heartbeat
 * and a three-minute window, because getting it wrong costs somebody an
 * order. This one only decorates a list, so it is written from the auth
 * callback that re-reads the row anyway and read with a window generous
 * enough that reading a page counts as being here.
 */

/** How long after their last request an account still reads as online. */
export const ONLINE_WINDOW_MS = 5 * 60_000;

/**
 * How stale the stored timestamp has to be before the auth callback writes a
 * new one. Comfortably inside the window above, so an account that is
 * genuinely here never flickers offline between writes, and far enough apart
 * that an active session costs one write every few minutes rather than one
 * per request.
 */
export const PRESENCE_WRITE_AFTER_MS = 2 * 60_000;

export function isOnline(lastSeenAt: Date | number | null | undefined, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const at = typeof lastSeenAt === "number" ? lastSeenAt : lastSeenAt.getTime();
  return now - at < ONLINE_WINDOW_MS;
}
