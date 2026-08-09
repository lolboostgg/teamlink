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
 * One statement in the case that happens every 45 seconds for every online
 * teammate — the panel is still open, so only the beat itself is written. The
 * second query is the return-after-an-absence path, which by definition runs
 * once per return.
 */
export async function markTeammatePresent(userId: string, now: Date): Promise<void> {
  const stillHere = await prisma.teammate.updateMany({
    where: { userId, lastSeenAt: { gte: new Date(now.getTime() - PRESENCE_MAX_AGE_MS) } },
    data: { lastSeenAt: now },
  });
  if (stillHere.count > 0) return;

  const teammate = await prisma.teammate.findUnique({
    where: { userId },
    select: { id: true, available: true, availableSince: true, lastSeenAt: true },
  });
  if (!teammate) return;
  await prisma.teammate.update({ where: { id: teammate.id }, data: presenceUpdate(teammate, now) });
}
