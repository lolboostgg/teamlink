import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ranksForGame } from "@/lib/gameRanks";
import { DISPATCH_EVENT, logDispatch } from "@/lib/dispatch/log";

/**
 * Wave dispatch.
 *
 * An order is not offered to everyone at once and it is not a list anyone
 * browses. The dispatcher filters the roster down to who may take this
 * specific order, sorts them, and alerts the top few for a handful of
 * seconds. If that group doesn't fill the order, the next group goes out.
 *
 * The search has no deadline. Teammates come online continuously, so an order
 * nobody can take right now is not an order nobody can ever take — it keeps
 * cycling until somebody accepts or the customer cancels. That is also why
 * the pool is recomputed per wave rather than frozen at dispatch: by wave
 * four, the roster is not the roster of wave one.
 */

/**
 * How far ahead `Order.dispatchDeadline` is parked.
 *
 * The column is non-null and several screens still read it, but it is no
 * longer a cut-off: nothing fails an order for reaching it.
 */
export const SEARCH_HORIZON_MS = 24 * 60 * 60 * 1000;

/** Teammates alerted per wave. */
export const WAVE_SIZE = 5;

/**
 * How long one wave's alert stays live before the next group goes out.
 *
 * Eight seconds is the window as designed, but it is not the window as
 * experienced: the alert has to reach a browser, that browser has to render
 * it, and a teammate has to look up, read a rank and a payout, and decide.
 * Measured from the wave going out, most of eight seconds is gone before any
 * of that starts, and the countdown a teammate actually sees read four.
 *
 * Fifteen leaves a real decision in it while still moving an unanswered
 * order on quickly — the whole point of waves is that nobody waits on one
 * person for long.
 */
export const WAVE_WINDOW_MS = 15_000;

/**
 * Pause before starting over once everyone eligible has been asked. Short
 * enough that a customer isn't left staring at nothing, long enough that we
 * aren't re-alerting the same five people twice a second.
 */
export const POOL_RETRY_MS = 15_000;

/**
 * How stale a teammate's last beat may be and still count as online.
 *
 * The online switch alone is not enough to go on: somebody flips it, shuts
 * the laptop, and stays online forever. The panel beats every 45s (see
 * useDispatchState); this allows several missed beats, because browsers
 * throttle timers in a background tab and a teammate waiting for work
 * usually has the dashboard behind whatever they are doing meanwhile.
 *
 * Generous, deliberately. A wave costs fifteen seconds to discover that
 * somebody isn't there, and the dispatcher moves on by itself — so inviting
 * one stale teammate is cheap, while wrongly excluding a real one who was
 * simply in a background tab is not.
 */
const HEARTBEAT_MAX_AGE_MS = 180_000;

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * How many acceptances end the search.
 *
 * Not simply the number of teammates booked: the customer picks from whoever
 * accepted, and a picker with exactly one option isn't a choice. Two spare
 * candidates is enough to choose from without keeping people hanging.
 */
export function candidateTarget(teammatesRequested: number): number {
  return Math.min(5, Math.max(1, teammatesRequested) + 2);
}

/**
 * Position of a rank on its game's ladder. Higher is stronger; -1 for an
 * unknown or unset rank, which every comparison below treats as "no limit".
 */
export function rankIndex(gameSlug: string, rank: string | null | undefined): number {
  if (!rank) return -1;
  return ranksForGame(gameSlug).findIndex((option) => option.value === rank);
}

type TeammateRow = {
  id: string;
  userId: string | null;
  name: string;
  rating: number;
  gameSlugs: unknown;
  gameProfiles: unknown;
  regions: unknown;
  maxRankSelf: string | null;
  maxRankAdmin: string | null;
  availableSince: Date | null;
  lastSeenAt: Date | null;
  lastDispatchAt: Date | null;
  createdAt: Date;
};

type OrderRow = {
  id: string;
  gameSlug: string;
  clientUserId: string | null;
  requestedTeammateId: string | null;
  teammatesRequested: number;
  ignRegion: string | null;
  ignRank: string | null;
  ignRoles: unknown;
};

export interface PoolResult {
  pool: TeammateRow[];
  /** Where the roster was cut, for the dispatch log. */
  funnel: {
    online: number;
    listed: number;
    region: number;
    rank: number;
    free: number;
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/**
 * The ceiling a teammate may be alerted up to.
 *
 * The admin limit wins outright rather than being one of two values compared:
 * a teammate setting their own limit to Master must not be able to opt into
 * orders above what we have cleared them for.
 */
function rankCeiling(gameSlug: string, teammate: TeammateRow): number {
  const admin = rankIndex(gameSlug, teammate.maxRankAdmin);
  const self = rankIndex(gameSlug, teammate.maxRankSelf);
  if (admin >= 0 && self >= 0) return Math.min(admin, self);
  return admin >= 0 ? admin : self;
}

/**
 * Everyone who may take this order, strongest claim first.
 *
 * `exclude` holds teammates who already have a candidate row on this order —
 * they have had their turn, whichever way it went.
 */
export async function eligiblePool(
  client: Client,
  order: OrderRow,
  exclude: Set<string>,
  now: Date,
): Promise<PoolResult> {
  const heartbeatCutoff = new Date(now.getTime() - HEARTBEAT_MAX_AGE_MS);
  const online = (await client.teammate.findMany({
    where: { available: true, lastSeenAt: { gte: heartbeatCutoff } },
  })) as unknown as TeammateRow[];

  // gameSlugs is a Json array, so "listed for this game" can't be pushed into
  // the query — the roster is small enough to filter in memory.
  const listed = online.filter((t) => asStringArray(t.gameSlugs).includes(order.gameSlug));

  // A teammate who names no regions serves all of them; an order with no
  // region reaches everyone. Only two explicit, disagreeing answers exclude.
  const region = listed.filter((t) => {
    const regions = asStringArray(t.regions);
    if (!order.ignRegion || regions.length === 0) return true;
    return regions.includes(order.ignRegion);
  });

  const orderRank = rankIndex(order.gameSlug, order.ignRank);
  const rank = region.filter((t) => {
    if (orderRank < 0) return true;
    const ceiling = rankCeiling(order.gameSlug, t);
    return ceiling < 0 || orderRank <= ceiling;
  });

  const busy = new Set(
    (
      await client.dispatchCandidate.findMany({
        where: {
          teammateId: { in: rank.map((t) => t.id) },
          OR: [
            { selected: true, order: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } },
            { status: "ACCEPTED", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
            { status: "PENDING", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
          ],
        },
        select: { teammateId: true },
      })
    ).map((c) => c.teammateId),
  );

  const free = rank.filter((t) => !busy.has(t.id) && !exclude.has(t.id));

  return {
    pool: await sortByPriority(client, free, order, now),
    funnel: {
      online: online.length,
      listed: listed.length,
      region: region.length,
      rank: rank.length,
      free: free.length,
    },
  };
}

/**
 * Who gets alerted first.
 *
 * Today this is fairness plus a nudge for rating: a favorite is guaranteed
 * in, then whoever has waited longest since their last alert. The per-rank
 * performance score replaces the middle of this function — it is deliberately
 * the only place that decides order, so that swap touches nothing else.
 */
async function sortByPriority(
  client: Client,
  teammates: TeammateRow[],
  order: OrderRow,
  now: Date,
): Promise<TeammateRow[]> {
  const favorites = order.clientUserId
    ? new Set(
        (
          await client.favoriteTeammate.findMany({
            where: { clientUserId: order.clientUserId, teammateId: { in: teammates.map((t) => t.id) } },
            select: { teammateId: true },
          })
        ).map((favorite) => favorite.teammateId),
      )
    : new Set<string>();

  const wantedRoles = asStringArray(order.ignRoles);

  const score = (teammate: TeammateRow) => {
    // Waiting time is measured from the last alert, not from going online:
    // somebody who has been online for six hours and taken four orders has
    // not been waiting, and priority based on total session length would
    // reward leaving the tab open over doing the work.
    const waitSince = teammate.lastDispatchAt ?? teammate.availableSince ?? teammate.lastSeenAt ?? teammate.createdAt;
    const waitingMinutes = Math.max(0, (now.getTime() - waitSince.getTime()) / 60_000);

    // Role is a nudge, not a gate. On a roster this size a hard role filter
    // empties the pool far more often than it improves the match.
    const profile = (teammate.gameProfiles as Record<string, { roles?: unknown }> | null)?.[order.gameSlug];
    const roles = asStringArray(profile?.roles);
    const roleMatch = wantedRoles.length > 0 && roles.some((role) => wantedRoles.includes(role));

    return (
      (favorites.has(teammate.id) ? 1_000_000 : 0) +
      waitingMinutes * 100 +
      (roleMatch ? 250 : 0) +
      teammate.rating * 10
    );
  };

  return [...teammates].sort((a, b) => score(b) - score(a) || a.createdAt.getTime() - b.createdAt.getTime());
}

export interface WaveResult {
  /** Teammates alerted, for the caller to wake over the event bus. */
  invited: { id: string; userId: string | null; name: string }[];
  wave: number;
  /** True when the filters left nobody to ask this time round. */
  exhausted: boolean;
}

/**
 * Sends the next wave.
 *
 * Writes the candidate rows, moves the order's wave clock, and logs both the
 * funnel and who was picked. Publishing and mailing are the caller's job:
 * they must not happen until the transaction this runs in has committed.
 */
export async function sendWave(client: Client, orderId: string, now: Date): Promise<WaveResult> {
  const order = (await client.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { candidates: true },
  })) as unknown as OrderRow & {
    dispatchWave: number;
    candidates: { teammateId: string; status: string }[];
  };

  const wave = order.dispatchWave + 1;

  // A "play again" order is addressed to one specific teammate. There is no
  // pool and no next wave — either they take it or the order ends.
  if (order.requestedTeammateId) {
    const requested = (await client.teammate.findUnique({
      where: { id: order.requestedTeammateId },
    })) as unknown as TeammateRow | null;
    if (!requested) return { invited: [], wave, exhausted: true };
    await inviteAll(client, orderId, [requested], wave, now);
    await logDispatch(client, orderId, DISPATCH_EVENT.WAVE, `Wave ${wave} sent to ${requested.name} (requested).`, {
      teammateId: requested.id,
      detail: { wave, requested: true },
    });
    return { invited: [pick(requested)], wave, exhausted: false };
  }

  const exclude = new Set(order.candidates.map((c) => c.teammateId));
  const { pool, funnel } = await eligiblePool(client, order, exclude, now);
  const invitees = pool.slice(0, WAVE_SIZE);

  if (wave === 1) {
    await logDispatch(
      client,
      orderId,
      DISPATCH_EVENT.POOL,
      `${funnel.free} eligible of ${funnel.online} online — ${funnel.listed} play ${order.gameSlug}, ` +
        `${funnel.region} match the region, ${funnel.rank} are cleared for the rank.`,
      { detail: funnel },
    );
  }

  if (invitees.length === 0) {
    await logDispatch(client, orderId, DISPATCH_EVENT.EXHAUSTED, `Wave ${wave}: nobody left to ask.`, {
      detail: { wave, ...funnel },
    });
    return { invited: [], wave, exhausted: true };
  }

  await inviteAll(client, orderId, invitees, wave, now);
  await logDispatch(
    client,
    orderId,
    DISPATCH_EVENT.WAVE,
    `Wave ${wave} sent to ${invitees.length} of ${funnel.free} eligible: ${invitees.map((t) => t.name).join(", ")}.`,
    { detail: { wave, sent: invitees.length, eligible: funnel.free } },
  );

  return { invited: invitees.map(pick), wave, exhausted: false };
}

function pick(teammate: TeammateRow) {
  return { id: teammate.id, userId: teammate.userId, name: teammate.name };
}

async function inviteAll(
  client: Client,
  orderId: string,
  teammates: TeammateRow[],
  wave: number,
  now: Date,
): Promise<void> {
  const expiresAt = new Date(now.getTime() + WAVE_WINDOW_MS);

  for (const teammate of teammates) {
    // Upsert, not create: a teammate who timed out in an earlier round can be
    // asked again once the dispatcher starts over, and the unique constraint
    // on (orderId, teammateId) means that has to reuse their row.
    await client.dispatchCandidate.upsert({
      where: { orderId_teammateId: { orderId, teammateId: teammate.id } },
      create: { orderId, teammateId: teammate.id, invitedAt: now, expiresAt, wave },
      update: {
        status: "PENDING",
        invitedAt: now,
        expiresAt,
        wave,
        respondedAt: null,
        deliveredAt: null,
      },
    });
  }

  await client.order.update({
    where: { id: orderId },
    data: { dispatchWave: wave, waveDeadline: expiresAt, poolExhaustedAt: null },
  });

  await client.teammate.updateMany({
    where: { id: { in: teammates.map((t) => t.id) } },
    data: { lastDispatchAt: now },
  });
}

/**
 * Clears the way for another round once everyone has been asked.
 *
 * Timed-out and superseded rows are deleted rather than kept: the unique
 * constraint means a teammate can only hold one row per order, and the
 * dispatch log already has the history these rows would otherwise be
 * carrying. A decline stays — they said no to this order, and asking again
 * would be pestering.
 */
export async function resetForRetry(client: Client, orderId: string, now: Date): Promise<void> {
  const cleared = await client.dispatchCandidate.deleteMany({
    where: { orderId, status: { in: ["TIMED_OUT", "SUPERSEDED"] } },
  });
  await client.order.update({ where: { id: orderId }, data: { poolExhaustedAt: null } });
  await logDispatch(
    client,
    orderId,
    DISPATCH_EVENT.POOL,
    `Starting over — ${cleared.count} earlier invitation${cleared.count === 1 ? "" : "s"} released.`,
    { detail: { cleared: cleared.count, at: now.toISOString() } },
  );
}
