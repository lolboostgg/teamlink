import { prisma } from "@/lib/db";

/**
 * How stale a teammate's last beat may be and still count as being there.
 *
 * The online switch alone is not enough to go on: somebody flips it, shuts
 * the laptop, and stays online forever. The panel beats every 45s (see
 * useDispatchState); this allows several missed beats, because browsers
 * throttle timers in a background tab and a teammate waiting for work usually
 * has the dashboard behind whatever they are doing meanwhile.
 *
 * Generous, deliberately. A wave costs fifteen seconds to discover that
 * somebody isn't there, and the dispatcher moves on by itself — so inviting
 * one stale teammate is cheap, while wrongly excluding a real one who was
 * simply in a background tab is not. It is also why a reload does not reset
 * the wait clock below: a page that comes straight back was never gone.
 */
export const PRESENCE_MAX_AGE_MS = 180_000;

/**
 * How often a beat is actually written down.
 *
 * The panel reports in far more often than the answer can change, and every
 * report was a row update: measured against the live database, presence writes
 * were the single most expensive thing the application did — sixteen thousand
 * UPDATEs on a seven-row table, forty-two seconds of database time, more than
 * every SELECT in the system put together. Each one writes a new row version,
 * touches every index on the table and leaves a dead tuple behind, which is
 * also why a table holding seven teammates had grown to 400 kB.
 *
 * A third of the staleness window keeps two beats of margin before anyone is
 * counted away, so nothing about who is reachable changes. It writes a quarter
 * as often as the fifteen seconds it replaces, which were twelve times more
 * often than PRESENCE_MAX_AGE_MS ever required.
 */
export const PRESENCE_WRITE_EVERY_MS = 60_000;

interface PresenceRow {
  available: boolean;
  availableSince: Date | null;
  lastSeenAt: Date | null;
}

/** Whether this teammate's panel has been gone long enough to count as away. */
export function hasBeenAway(teammate: PresenceRow, now: Date): boolean {
  return !teammate.lastSeenAt || now.getTime() - teammate.lastSeenAt.getTime() >= PRESENCE_MAX_AGE_MS;
}

/**
 * What to write when a teammate's panel reports in.
 *
 * `availableSince` is what the idle panel counts "time elapsed" from, and it
 * used to survive the browser being closed — so a teammate who went online in
 * the morning, shut the tab and came back after lunch was greeted with "134
 * min elapsed" for a wait they had not been present for. It restarts whenever
 * the panel has been away, which is the same line dispatch already draws when
 * it decides who is reachable: a clock that keeps running while nobody can be
 * invited is measuring nothing.
 *
 * Offline teammates are left alone — going offline clears `availableSince`
 * (see setOnlineAction), and the switch is what starts it again.
 */
export function presenceUpdate(teammate: PresenceRow, now: Date) {
  const restart = teammate.available && (hasBeenAway(teammate, now) || !teammate.availableSince);
  return { lastSeenAt: now, ...(restart ? { availableSince: now } : {}) };
}

/**
 * The same thing for callers that don't already hold the row.
 *
 * A read first, and usually nothing else. This used to open with an
 * unconditional `updateMany`, chosen because it was one statement rather than
 * two — but it wrote on *every* beat, and the two are not the same kind of
 * statement. A read of one indexed row costs the database nothing measurable;
 * an update writes a new row version, touches every index on the table, emits
 * WAL and leaves a dead tuple for vacuum. Trading a guaranteed write for a
 * guaranteed read plus a write once a minute is what took presence from the
 * most expensive thing this application does to a rounding error.
 *
 * The second statement is now the throttle expiring or a return after an
 * absence — both rare — rather than the common case.
 */
export async function markTeammatePresent(userId: string, now: Date): Promise<void> {
  const teammate = await prisma.teammate.findUnique({
    where: { userId },
    select: { id: true, available: true, availableSince: true, lastSeenAt: true },
  });
  if (!teammate) return;
  // Already recorded recently enough. Nobody can observe the difference: the
  // row still says "here" by every rule that reads it.
  if (teammate.lastSeenAt && now.getTime() - teammate.lastSeenAt.getTime() < PRESENCE_WRITE_EVERY_MS) return;

  await prisma.teammate.update({ where: { id: teammate.id }, data: presenceUpdate(teammate, now) });
}
