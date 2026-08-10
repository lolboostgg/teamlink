import { after } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { notifyUser, notifyAdmins } from "@/lib/notifications/service";
import { payoutForOrder } from "@/lib/payoutSplit";
import { publish } from "@/lib/events/bus";
import { issueSessionRewardCoupon } from "@/lib/couponsServer";
import { notifyTeammateAssigned, notifyOrderCompleted, appUrl } from "@/lib/notify/orderNotifications";
import { postToTeammateChannel } from "@/lib/notify/discordNotify";
import { formatRank } from "@/lib/gameRanks";
import { sendMail } from "@/lib/notify/mail";
import { plainNoticeMail } from "@/lib/notify/templates";
import { settleCancelledOrder, type RefundOutcome } from "@/lib/orderRefunds";
import { captureOrderPayment } from "@/lib/orderPayments";
import { DISPATCH_EVENT, logDispatch } from "@/lib/dispatch/log";
import { candidateTarget, sendWave, resetForRetry, POOL_RETRY_MS, type WaveResult } from "@/lib/dispatch/waves";

/**
 * Server-authoritative dispatch rules. Every transition that decides who
 * gets an order runs here inside a transaction — the browser can ask, but
 * it never decides. Replaces the localStorage simulation in
 * lib/matchmaking/store.ts for the teammate side.
 */

export const MAX_CANDIDATES = 5;
export const DISPATCH_WINDOW_MS = 60_000;
export const SELECTION_WINDOW_MS = 60_000;

/**
 * A grace period at the top of the search during which acceptances are
 * recorded but the customer's picker stays shut. It buys the customer time to
 * set their preferences (vibe, conversation, play style) on the searching
 * screen before the screen changes under them. Teammates are unaffected —
 * they see the request the instant it is dispatched.
 */
export const PICKER_REVEAL_DELAY_MS = 20_000;

/** Whether an order is past its reveal delay. Orders that were never
 * dispatched have no delay to serve. */
export function pickerRevealed(dispatchedAt: Date | null, now: Date): boolean {
  if (!dispatchedAt) return true;
  return dispatchedAt.getTime() + PICKER_REVEAL_DELAY_MS <= now.getTime();
}

/**
 * How long an order may sit assigned with nothing happening before it's given
 * up on.
 *
 * A teammate who accepts and then never shows leaves the customer waiting on a
 * session that will not start, and leaves themselves counted as busy — so no
 * later order can reach them either. Past this, the order is cancelled and the
 * customer gets what they paid back as store credit.
 */
export const ABANDONED_ASSIGNMENT_MS = 2 * 60 * 60 * 1000;

export class DispatchError extends Error {}

/**
 * Moves an order forward by whatever the clock has decided since the last
 * read: expiring unanswered invites, opening the selection window, and
 * auto-selecting the first acceptor when the customer runs out of time.
 * Idempotent, so it's safe to call on every read.
 */
/**
 * Announces that an order moved, so the client's matching screen and the
 * teammates' dispatch panels update now instead of on their next poll.
 * Addressed to the people actually on the order plus every admin; never
 * throws, since a missed notification must not fail the transition.
 */
export async function publishOrderChange(orderId: string) {
  try {
    const [order, admins] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        select: {
          clientUserId: true,
          // Every invited teammate, not only the selected ones — a candidate
          // whose invite just expired needs to see that too.
          candidates: { select: { teammate: { select: { userId: true } } } },
        },
      }),
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    ]);

    const userIds = new Set<string>(admins.map((admin) => admin.id));
    if (order?.clientUserId) userIds.add(order.clientUserId);
    for (const candidate of order?.candidates ?? []) {
      if (candidate.teammate.userId) userIds.add(candidate.teammate.userId);
    }

    const audience = [...userIds];
    await publish({ topic: "orders", key: orderId, userIds: audience });
    await publish({ topic: "dispatch", key: orderId, userIds: audience });
  } catch {
    // Best-effort: the polling fallback still catches this change.
  }
}

/** The bits of an ended order the refund and the notices need. */
interface EndedOrder {
  orderNo: number;
  gameName: string;
  clientUserId: string | null;
  priceEUR: number;
}

/**
 * Gives up on an assignment nobody ever turned into a session: the order is
 * cancelled and the customer's money comes back.
 *
 * The refund itself is refundOrder()'s job — store credit for an account, a
 * released hold or a refund for a guest — and it deliberately happens *after* this
 * transaction commits, not inside it. Talking to Stripe with a database
 * transaction held open would keep a pooled connection busy for the length of
 * a network round trip, and a refund that succeeded at Stripe while the
 * transaction later rolled back would be money returned that our own records
 * say is still ours.
 */
async function abandonAssignment(tx: Prisma.TransactionClient, order: { id: string }) {
  return tx.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED", sessionStatus: null },
  });
}

/**
 * Orders reconciled in the last second, and what they returned.
 *
 * Every open tab reading an order calls reconcileOrder, and they all call it
 * with the same clock. Ten readers a second on one order is ten transactions
 * that reach the same conclusion, nine of which exist only to lose a race —
 * and each one holds a pooled connection while it does. Coalescing them costs
 * a Map and nothing else.
 *
 * Deliberately per-process and in-memory: it is an optimisation, never a
 * correctness mechanism. Two processes racing still land in the transaction,
 * which is where the actual guarantees live.
 */
const recentReconciles = new Map<string, { at: number; result: Promise<unknown> }>();
const RECONCILE_COALESCE_MS = 1_000;

export async function reconcileOrder(orderId: string) {
  const inflight = recentReconciles.get(orderId);
  if (inflight && Date.now() - inflight.at < RECONCILE_COALESCE_MS) {
    return inflight.result as ReturnType<typeof runReconcile>;
  }
  const result = runReconcile(orderId);
  recentReconciles.set(orderId, { at: Date.now(), result });
  // Bounded: this is a cache with a one-second life, not a leak waiting to
  // happen on a long-lived process.
  if (recentReconciles.size > 500) {
    const cutoff = Date.now() - RECONCILE_COALESCE_MS;
    for (const [id, entry] of recentReconciles) if (entry.at < cutoff) recentReconciles.delete(id);
  }
  return result;
}

async function runReconcile(orderId: string) {
  const now = new Date();

  // Cheap gate before the expensive part.
  //
  // A transaction that reads the order, sweeps the candidates, and writes
  // nothing is the single most common thing this app does — an order sitting
  // assigned for an hour is read constantly and can change nothing. One
  // indexed read here replaces that transaction in the overwhelming majority
  // of calls.
  const peek = await prisma.order.findUnique({ where: { id: orderId } });
  if (!peek) return null;
  if (["AWAITING_PAYMENT", "COMPLETED", "CANCELLED", "NO_MATCH"].includes(peek.status)) return peek;

  if (peek.status === "ASSIGNED" || peek.status === "IN_PROGRESS" || peek.status === "CANCEL_PENDING") {
    // Only the abandonment clock can move these, and it is two hours long.
    const stale =
      peek.status === "ASSIGNED" &&
      peek.assignedAt !== null &&
      peek.assignedAt.getTime() + ABANDONED_ASSIGNMENT_MS <= now.getTime();
    if (!stale) return peek;
  } else {
    // Searching or selecting: something is due only if a clock has run out or
    // somebody has answered. `count` beats fetching the rows — the answer is
    // a number and the decision is "is it zero".
    const [expired, answered] = await Promise.all([
      prisma.dispatchCandidate.count({ where: { orderId, status: "PENDING", expiresAt: { lte: now } } }),
      prisma.dispatchCandidate.count({ where: { orderId, status: "ACCEPTED" } }),
    ]);
    const waveDue =
      !peek.matchingPaused &&
      peek.status !== "SELECTING" &&
      (peek.poolExhaustedAt
        ? peek.poolExhaustedAt.getTime() + POOL_RETRY_MS <= now.getTime()
        : !peek.waveDeadline || peek.waveDeadline <= now);
    const selectionDue =
      peek.status === "SELECTING" && peek.selectionDeadline !== null && peek.selectionDeadline <= now;
    const pickerDue = answered > 0 && peek.status !== "SELECTING" && pickerRevealed(peek.dispatchedAt, now);

    if (expired === 0 && !waveDue && !selectionDue && !pickerDue) return peek;
  }

  return runReconcileTransaction(orderId, now);
}

async function runReconcileTransaction(orderId: string, now: Date) {

  // Captured from the transaction's own read so the clock-driven transitions
  // can be announced without paying for a second query on every reconcile —
  // and this runs on every order read.
  let previousStatus: string | null = null;
  // Two ways an order can end owing the customer their money: somebody
  // accepted and never showed up, or nobody ever accepted at all. Both are
  // settled after the transaction commits, so they are carried out of it.
  //
  // On a property of a held object rather than in plain `let`s: the compiler
  // does not follow assignments made inside the transaction callback, so a
  // `let` initialised to null narrows to `never` at every use down here.
  // Nothing complained while these were only passed along — `never` is
  // assignable to anything — but reading a field off one does not compile.
  const ended: { abandoned: EndedOrder | null; noMatch: EndedOrder | null } = {
    abandoned: null,
    noMatch: null,
  };
  // A wave sent inside the transaction below. Waking the invited teammates
  // has to wait until it commits — publishing first would send them to read a
  // row that does not exist yet.
  //
  // An array rather than a nullable `let`, because TypeScript's control-flow
  // analysis doesn't follow assignments made inside a closure: it still
  // believes the variable holds its initialiser afterwards, narrows it to
  // null, and then types every property read as `never`.
  const waved: WaveResult[] = [];
  // Set when this pass is the one that runs the pool dry, so the call to
  // Discord happens after the transaction commits rather than inside it.
  let poolJustExhausted: Parameters<typeof announceUnclaimedOrder>[0] | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
    if (!order) return null;
    previousStatus = order.status;

    // Assigned, but the session never started and no game was ever submitted.
    // Only ASSIGNED: once a teammate is in-game there is real work in flight,
    // and that is not something a clock should throw away.
    if (
      order.status === "ASSIGNED" &&
      order.assignedAt &&
      order.assignedAt.getTime() + ABANDONED_ASSIGNMENT_MS <= now.getTime() &&
      (await tx.sessionGame.count({ where: { orderId } })) === 0
    ) {
      ended.abandoned = {
        orderNo: order.orderNo,
        gameName: order.gameName,
        clientUserId: order.clientUserId,
        priceEUR: Number(order.priceEUR),
      };
      return abandonAssignment(tx, order);
    }

    // AWAITING_PAYMENT has no dispatch window running yet — the clock only
    // starts when the payment releases it, so it must not age out here.
    if (["AWAITING_PAYMENT", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_MATCH"].includes(order.status)) {
      return order;
    }

    // Invites nobody answered in time. Logged one by one rather than as a
    // count: which teammate let a wave lapse is exactly what the priority
    // scoring will need to read back, and what an admin asks about first.
    const lapsed = await tx.dispatchCandidate.findMany({
      where: { orderId, status: "PENDING", expiresAt: { lte: now } },
      select: { teammateId: true, wave: true, deliveredAt: true, teammate: { select: { name: true } } },
    });
    if (lapsed.length > 0) {
      await tx.dispatchCandidate.updateMany({
        where: { orderId, status: "PENDING", expiresAt: { lte: now } },
        data: { status: "TIMED_OUT", respondedAt: now },
      });
      for (const miss of lapsed) {
        await logDispatch(
          tx,
          orderId,
          DISPATCH_EVENT.TIMED_OUT,
          miss.deliveredAt
            ? `${miss.teammate.name} let wave ${miss.wave} lapse.`
            : `${miss.teammate.name} timed out on wave ${miss.wave} — the alert was never confirmed as delivered.`,
          // `delivered` is what separates "ignored us" from "never reached
          // them", and only the first may ever count against a teammate.
          { teammateId: miss.teammateId, detail: { wave: miss.wave, delivered: Boolean(miss.deliveredAt) } },
        );
      }
    }

    const candidates = await tx.dispatchCandidate.findMany({ where: { orderId } });
    const accepted = candidates
      .filter((c) => c.status === "ACCEPTED")
      .sort((a, b) => (a.respondedAt?.getTime() ?? 0) - (b.respondedAt?.getTime() ?? 0));
    const target = candidateTarget(order.teammatesRequested);

    // Enough people said yes. Whoever still has the alert on screen loses
    // nothing by it — being beaten to an order is not a miss, and marking
    // these TIMED_OUT would have the scoring read it as one.
    if (accepted.length >= target) {
      const beaten = candidates.filter((c) => c.status === "PENDING");
      if (beaten.length > 0) {
        await tx.dispatchCandidate.updateMany({
          where: { orderId, status: "PENDING" },
          data: { status: "SUPERSEDED", respondedAt: now },
        });
        await logDispatch(
          tx,
          orderId,
          DISPATCH_EVENT.SUPERSEDED,
          `${beaten.length} alert${beaten.length === 1 ? "" : "s"} withdrawn — the order already had ${accepted.length} acceptance${accepted.length === 1 ? "" : "s"}.`,
          { detail: { withdrawn: beaten.length, accepted: accepted.length } },
        );
      }
    }

    const settled = candidates.every((c) => c.status !== "PENDING");

    // The customer sets vibe, conversation and play style on the searching
    // screen; a teammate answering in the first couple of seconds used to
    // yank that screen away mid-choice. So the picker is held shut for a
    // short beat after dispatch — the invitations still go out at once and
    // acceptances still land, they just aren't acted on yet. Held here
    // rather than hidden in the customer view on purpose: the selection
    // window has to start when the customer can actually see the picker,
    // not while it is still closed.
    const revealed = pickerRevealed(order.dispatchedAt, now);

    if (order.status === "SEARCHING" || order.status === "CANDIDATES_READY") {
      // The first acceptance opens the picker immediately. Other pending
      // invitees remain eligible and may continue filling the five slots.
      if (accepted.length > 0 && revealed) {
        await logDispatch(tx, orderId, DISPATCH_EVENT.SELECTION, `Customer selection opened with ${accepted.length} candidate${accepted.length === 1 ? "" : "s"}.`);
        return tx.order.update({
          where: { id: orderId },
          data: { status: "SELECTING", selectionDeadline: new Date(now.getTime() + SELECTION_WINDOW_MS) },
        });
      }

      // A "play again" order is addressed to one teammate. There is no next
      // wave to fall through to, so their answer ends it.
      if (order.isReplay && settled && accepted.length === 0) {
        await logDispatch(tx, orderId, DISPATCH_EVENT.ENDED, "The requested teammate didn't take it.");
        return tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      }

      // Everything below is the wave clock. There is no failure state here:
      // the search runs until somebody accepts or the customer cancels, and
      // an order nobody can take this second is not an order nobody can ever
      // take — teammates come online continuously.
      if (!order.matchingPaused && !order.requestedTeammateId) {
        const waveOver = settled || !order.waveDeadline || order.waveDeadline <= now;

        if (order.poolExhaustedAt) {
          // Everyone eligible has been asked. Wait a beat, then release the
          // lapsed invitations so the same people can be reached again.
          if (order.poolExhaustedAt.getTime() + POOL_RETRY_MS <= now.getTime()) {
            await resetForRetry(tx, orderId, now);
            const retry = await sendWave(tx, orderId, now);
            if (retry.exhausted) {
              await tx.order.update({ where: { id: orderId }, data: { poolExhaustedAt: now } });
            } else {
              waved.push(retry);
            }
          }
        } else if (waveOver) {
          const next = await sendWave(tx, orderId, now);
          if (next.exhausted) {
            await tx.order.update({ where: { id: orderId }, data: { poolExhaustedAt: now } });
            // Only on the null -> exhausted edge. The retry branch above sets
            // the same column every POOL_RETRY_MS, and announcing there would
            // repost the same order into the channel every few minutes for as
            // long as it went unanswered.
            poolJustExhausted = {
              orderNo: order.orderNo,
              gameName: order.gameName,
              option: order.option,
              priceEUR: Number(order.priceEUR),
              payoutEUR: Number(order.teammatePayoutEUR),
              teammatesRequested: order.teammatesRequested,
              ign: order.ign,
              ignRegion: order.ignRegion,
              rank: formatRank(order.gameSlug, order.ignRank, order.ignDivision),
              waves: order.dispatchWave,
            };
          } else {
            waved.push(next);
          }
        }

        return tx.order.findUnique({ where: { id: orderId } });
      }
    }

    // Customer let the timer run out — the auto-select candidate gets it.
    if (order.status === "SELECTING" && order.selectionDeadline && order.selectionDeadline <= now) {
      const winners = accepted.slice(0, Math.max(1, order.teammatesRequested));
      if (winners.length === 0) {
        // Nobody took it and the window is gone. The customer paid for a
        // session that will not happen, so the money goes back once this
        // commits — see the settle call below.
        ended.noMatch = {
          orderNo: order.orderNo,
          gameName: order.gameName,
          clientUserId: order.clientUserId,
          priceEUR: Number(order.priceEUR),
        };
        return tx.order.update({ where: { id: orderId }, data: { status: "NO_MATCH" } });
      }
      await assignWinners(tx, orderId, winners.map((w) => w.id), now);
      return tx.order.findUnique({ where: { id: orderId } });
    }

    return order;
  });

  // Both of these give money back and mail the customer, so they run outside
  // the transaction above — Stripe and the mail server have no business
  // holding a database connection open.
  if (ended.abandoned) {
    const refund = await settleCancelledOrder({ id: orderId, ...ended.abandoned }, "never_started");
    await announceAbandonedOrder(orderId, ended.abandoned, refund);
  }
  if (ended.noMatch) {
    await settleCancelledOrder({ id: orderId, ...ended.noMatch }, "no_match");
  }

  // Everyone eligible has now been asked and nobody took it. The dispatcher
  // keeps retrying on its own, but until somebody comes online it is retrying
  // against the same empty pool — so the order goes where teammates who are
  // not in the panel will still see it. This is revenue that otherwise
  // expires quietly.
  if (poolJustExhausted) {
    await announceUnclaimedOrder(poolJustExhausted);
  }

  // The one event where a poll interval is the difference between taking an
  // order and losing it: a wave is eight seconds long.
  const sentWave = waved[0];
  if (sentWave && sentWave.invited.length > 0) {
    const userIds = sentWave.invited.map((t) => t.userId).filter((id): id is string => Boolean(id));
    await publish({ topic: "dispatch", key: orderId, userIds });
  }

  if (result && previousStatus !== null && result.status !== previousStatus) {
    await publishOrderChange(orderId);

    // Auto-select fired: the selection window ran out, which almost always
    // means the customer isn't looking at the page. Mail them. A customer who
    // picked for themselves is by definition already on the screen and needs
    // no mail, so the other assignment paths deliberately stay quiet. The
    // status comparison is also what keeps this to one mail — a later
    // reconcile sees ASSIGNED on both sides and does nothing.
    if (previousStatus === "SELECTING" && result.status === "ASSIGNED") {
      void notifyTeammateAssigned(orderId);
      await captureOnAssignment(orderId);
    }
  }
  return result;
}

/**
 * An order the dispatcher has run out of people to ask, into the operations
 * channel.
 *
 * That channel is read by admins, not by teammates — so this is written for
 * somebody who can act on it: the full order, what it pays, and a link into
 * the admin view. The dispatcher keeps retrying on its own, but until
 * somebody comes online it is retrying against an empty room, and the useful
 * response is a human nudging a teammate rather than the loop trying again.
 *
 * Best-effort, like every other outbound: a missed post must not fail the
 * dispatch pass that produced it.
 */
async function announceUnclaimedOrder(order: {
  orderNo: number;
  gameName: string;
  option: string;
  priceEUR: number;
  payoutEUR: number;
  teammatesRequested: number;
  ign: string | null;
  ignRegion: string | null;
  rank: string | null;
  waves: number;
}): Promise<void> {
  try {
    const seats = order.teammatesRequested === 1 ? "1 teammate" : `${order.teammatesRequested} teammates`;
    await postToTeammateChannel({
      title: "⚠️ Order waiting · nobody left to ask",
      description:
        `**${order.option}** on **${order.gameName}** — looking for ${seats}. ` +
        `Every eligible teammate has been invited and the pool is dry.`,
      fields: [
        { name: "Order", value: `#${order.orderNo}`, inline: true },
        { name: "Total", value: `€${order.priceEUR.toFixed(2)}`, inline: true },
        { name: "Payout", value: `€${order.payoutEUR.toFixed(2)}`, inline: true },
        { name: "Rank", value: order.rank ?? "Unranked", inline: true },
        { name: "Region", value: order.ignRegion ? order.ignRegion.toUpperCase() : "Any", inline: true },
        { name: "Waves sent", value: String(order.waves), inline: true },
        ...(order.ign ? [{ name: "Player", value: order.ign, inline: false }] : []),
      ],
      color: 0xf5a524,
      linkUrl: `${appUrl()}/dashboard/admin/orders/${order.orderNo}`,
      linkLabel: "Open in admin",
    });
  } catch {
    // The announcement failing must not take the dispatch pass with it.
  }
}

/**
 * The bells for an abandoned assignment. The customer's mail is sent by
 * settleCancelledOrder(); this is the in-app half, and the admin line.
 *
 * Both messages describe what the refund actually did rather than assuming
 * it. The admin line used to read "guest order, nothing credited" — true at
 * the time and the reason a guest's money went missing quietly.
 */
async function announceAbandonedOrder(
  orderId: string,
  order: { orderNo: number; gameName: string; clientUserId: string | null; priceEUR: number },
  refund: RefundOutcome,
) {
  const amount = `€${(refund.cents / 100).toFixed(2)}`;
  const settled = refund.problem
    ? "the refund failed and needs doing by hand"
    : refund.method === "credit"
      ? `${amount} credited`
      : refund.method === "stripe"
        ? `${amount} refunded to the customer`
        : "nothing was owed";

  // An account holder gets the bell and, through it, the mail. A guest has
  // neither — no user row means notifyUser() cannot be called at all — so
  // this used to be the one cancellation a guest was never told about. They
  // are the people it matters most to: no dashboard to check, no order list
  // to notice it in, and money that has just moved.
  if (order.clientUserId) {
    await notifyUser(order.clientUserId, {
      type: "order.abandoned",
      title: "Your session never started",
      body: `Order #${order.orderNo} was cancelled and ${amount} is back in your balance as credit.`,
      href: "/dashboard/client/wallet",
    });
  } else {
    await mailGuestAbandoned(orderId, order.orderNo, refund);
  }
  await notifyAdmins({
    type: "order.abandoned",
    title: `Order abandoned · ${order.gameName}`,
    body: `#${order.orderNo} sat assigned without a session — ${settled}.`,
    href: `/dashboard/admin/orders/${order.orderNo}`,
  });
}

/**
 * The abandoned-order mail for an order with no account behind it.
 *
 * settleCancelledOrder() already mails the cancellation, which a guest does
 * receive; this is the notification half, which they did not, because every
 * path to it runs through notifyUser() and a guest has no user id. Sent
 * straight to the address on the order instead.
 */
async function mailGuestAbandoned(orderId: string, orderNo: number, refund: RefundOutcome): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { guestEmail: true, gameName: true, accessToken: true },
    });
    if (!order?.guestEmail) return;

    const amount = `€${(refund.cents / 100).toFixed(2)}`;
    const body = refund.problem
      ? `Order #${orderNo} was cancelled because the session never started. The refund needs doing by hand and we are on it — you do not have to chase us.`
      : `Order #${orderNo} was cancelled because the session never started, and ${amount} is on its way back to the card you paid with. It usually lands within a few working days.`;

    const mail = plainNoticeMail({
      name: null,
      heading: "Your session never started",
      body,
      url: order.accessToken ? `${appUrl()}/order/${order.accessToken}` : appUrl(),
    });
    await sendMail({ to: order.guestEmail, ...mail });
  } catch {
    // Best-effort, like the rest of the outbound in this file.
  }
}

/** Tells the picked teammates the order is theirs. */
async function notifySelected(
  tx: Prisma.TransactionClient,
  teammateIds: string[],
  gameName: string,
  // The number, not the id — it is what the session URL is keyed by, and a
  // notification is exactly the kind of link that outlives the change.
  orderNo: number,
) {
  const teammates = await tx.teammate.findMany({
    where: { id: { in: teammateIds }, userId: { not: null } },
    select: { userId: true },
  });
  if (teammates.length === 0) return;

  await tx.notification.createMany({
    data: teammates.map((t) => ({
      userId: t.userId as string,
      type: "order.assigned",
      title: "You've been selected",
      body: `The customer picked you for ${gameName}.`,
      href: `/dashboard/teammate/session/${orderNo}`,
    })),
  });
}

export async function assignWinners(
  tx: Prisma.TransactionClient,
  orderId: string,
  candidateIds: string[],
  now: Date,
) {
  // Guarded rather than assumed: the line below indexes [0], and an empty
  // list would hand Prisma an undefined id, throw inside the transaction,
  // and surface as a 500 on the customer's order read — which is not what a
  // "nobody to assign" situation should look like from the outside.
  if (candidateIds.length === 0) return;

  const winners = await tx.dispatchCandidate.findMany({
    where: { id: { in: candidateIds } },
    select: { teammateId: true },
  });
  await tx.dispatchCandidate.updateMany({
    where: { id: { in: candidateIds } },
    data: { selected: true, selectedAt: now },
  });
  await tx.dispatchCandidate.update({ where: { id: candidateIds[0] }, data: { isPrimary: true } });
  await tx.order.update({
    where: { id: orderId },
    data: { status: "ASSIGNED", assignedAt: now, sessionStatus: "WAITING_FOR_INVITE" },
  });
  await tx.teammate.updateMany({
    where: { id: { in: winners.map((winner) => winner.teammateId) } },
    data: { lastAssignedAt: now },
  });
}

/**
 * A teammate answering their invite. The accept path is the one place a
 * race actually matters: two teammates hitting Accept at the same instant
 * must not both become candidate #1, and the sixth acceptor must not get a
 * slot at all. Both are settled inside the transaction off the stored rows,
 * not off anything the client sent.
 */
export async function respondToDispatch(orderId: string, teammateId: string, accept: boolean) {
  const now = new Date();

  const responded = await prisma.$transaction(
    async (tx) => {
      const candidate = await tx.dispatchCandidate.findUnique({
        where: { orderId_teammateId: { orderId, teammateId } },
        include: { order: true },
      });
      if (!candidate) throw new DispatchError("You weren't invited to this order.");
      // Each of these used to read "You already answered this request",
      // which is only true for one of them and actively misleading for the
      // rest — a teammate who let a wave lapse was told they had answered it,
      // and one who was outraced was told the same. Both then ask why they
      // can't accept, and the message is the reason they can't tell.
      if (candidate.status === "TIMED_OUT") {
        throw new DispatchError("This request timed out — it's already gone to the next teammates.");
      }
      if (candidate.status === "SUPERSEDED") {
        throw new DispatchError("Someone else got there first on this one.");
      }
      if (candidate.status !== "PENDING") throw new DispatchError("You already answered this request.");
      if (candidate.expiresAt && candidate.expiresAt <= now) {
        await tx.dispatchCandidate.update({
          where: { id: candidate.id },
          data: { status: "TIMED_OUT", respondedAt: now },
        });
        throw new DispatchError("This request timed out — it's already gone to the next teammates.");
      }
      if (!["SEARCHING", "CANDIDATES_READY", "SELECTING"].includes(candidate.order.status)) {
        throw new DispatchError("This order is no longer taking candidates.");
      }

      if (!accept) {
        await logDispatch(tx, orderId, DISPATCH_EVENT.DECLINED, `Declined on wave ${candidate.wave}.`, {
          teammateId,
          detail: { wave: candidate.wave, afterMs: now.getTime() - candidate.invitedAt.getTime() },
        });
        return tx.dispatchCandidate.update({
          where: { id: candidate.id },
          data: { status: "DECLINED", respondedAt: now, manual: true },
        });
      }

      // A teammate already playing or already waiting on another customer's
      // pick can't take a second order.
      const busy = await tx.dispatchCandidate.findFirst({
        where: {
          teammateId,
          orderId: { not: orderId },
          OR: [
            { selected: true, order: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } },
            { status: "ACCEPTED", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
          ],
        },
      });
      if (busy) throw new DispatchError("You already have an order in progress.");

      const acceptedCount = await tx.dispatchCandidate.count({ where: { orderId, status: "ACCEPTED" } });
      if (acceptedCount >= MAX_CANDIDATES) throw new DispatchError("The candidate slots are already full.");

      const accepted = await tx.dispatchCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "ACCEPTED",
          respondedAt: now,
          manual: true,
          candidatePosition: acceptedCount + 1,
          isAutoSelect: acceptedCount === 0,
        },
      });
      await logDispatch(
        tx,
        orderId,
        DISPATCH_EVENT.ACCEPTED,
        `Accepted on wave ${candidate.wave} after ${Math.round((now.getTime() - candidate.invitedAt.getTime()) / 100) / 10}s — candidate #${acceptedCount + 1}.`,
        {
          teammateId,
          detail: { wave: candidate.wave, position: acceptedCount + 1, afterMs: now.getTime() - candidate.invitedAt.getTime() },
        },
      );
      const favorite = candidate.order.clientUserId
        ? await tx.favoriteTeammate.findUnique({
            where: { clientUserId_teammateId: { clientUserId: candidate.order.clientUserId, teammateId } },
            select: { teammateId: true },
          })
        : null;
      // Replay requests are exclusive to the previous teammate. Their
      // acceptance is the selection, so the customer never sees a five-slot picker.
      // A favorite gets the same atomic fast path on a single-slot order.
      if (candidate.order.requestedTeammateId === teammateId || (favorite && candidate.order.teammatesRequested === 1)) {
        await assignWinners(tx, orderId, [candidate.id], now);
        await notifySelected(tx, [teammateId], candidate.order.gameName, candidate.order.orderNo);
      } else if (candidate.order.status !== "SELECTING" && pickerRevealed(candidate.order.dispatchedAt, now)) {
        // Inside the reveal delay the acceptance is recorded but the picker
        // stays shut; reconcileOrder opens it the moment the delay is up.
        await tx.order.update({
          where: { id: orderId },
          data: { status: "SELECTING", selectionDeadline: new Date(now.getTime() + SELECTION_WINDOW_MS) },
        });
      }
      return accepted;
    },
    { isolationLevel: "Serializable" },
  );

  // The replay and favourite fast paths assign outright, without the customer
  // ever seeing a picker — so this is an assignment too.
  await captureOnAssignment(orderId);
  await publishOrderChange(orderId);
  return responded;
}

/** Releases an accepted candidate slot while the customer is still choosing. */
export async function withdrawDispatchAcceptance(orderId: string, teammateId: string) {
  const now = new Date();
  const withdrawn = await prisma.$transaction(async (tx) => {
    const candidate = await tx.dispatchCandidate.findUnique({
      where: { orderId_teammateId: { orderId, teammateId } },
      include: { order: true },
    });
    if (!candidate || candidate.status !== "ACCEPTED" || candidate.selected) {
      throw new DispatchError("This acceptance can no longer be withdrawn.");
    }
    if (!["SEARCHING", "CANDIDATES_READY", "SELECTING"].includes(candidate.order.status)) {
      throw new DispatchError("The customer has already finished choosing.");
    }
    await tx.dispatchCandidate.update({
      where: { id: candidate.id },
      data: { status: "DECLINED", respondedAt: now, candidatePosition: null, isAutoSelect: false },
    });
    const remaining = await tx.dispatchCandidate.findMany({
      where: { orderId, status: "ACCEPTED" },
      orderBy: { respondedAt: "asc" },
    });
    if (remaining.length === 0 && candidate.order.status === "SELECTING") {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANDIDATES_READY", selectionDeadline: null },
      });
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.dispatchCandidate.update({
        where: { id: remaining[i].id },
        data: { candidatePosition: i + 1, isAutoSelect: i === 0 },
      });
    }
  });

  await publishOrderChange(orderId);
  return withdrawn;
}

/** The customer picking. Only accepted candidates of a SELECTING order qualify. */
export async function selectTeammates(orderId: string, teammateIds: string[]) {
  const now = new Date();

  const picked = await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
      if (!order) throw new DispatchError("Unknown order.");
      if (order.status !== "SELECTING") throw new DispatchError("This order isn't waiting for a pick.");

      const eligible = order.candidates.filter((c) => c.status === "ACCEPTED" && teammateIds.includes(c.teammateId));
      if (eligible.length === 0) throw new DispatchError("That teammate isn't available for this order.");

      await assignWinners(tx, orderId, eligible.slice(0, Math.max(1, order.teammatesRequested)).map((c) => c.id), now);
      const assigned = await tx.order.findUnique({ where: { id: orderId }, include: { candidates: true } });
      await notifySelected(tx, eligible.map((c) => c.teammateId), order.gameName, order.orderNo);
      return assigned;
    },
    { isolationLevel: "Serializable" },
  );

  await captureOnAssignment(orderId);
  await publishOrderChange(orderId);
  return picked;
}

/**
 * Takes a guest's reserved money the moment the order is assigned.
 *
 * Assignment is what opens the order room, so this is "charged as soon as
 * the teammate is in the room" — expressed as the state change that puts
 * them there rather than as a side effect of the page rendering, which a
 * prefetch, a reload or a remount would each fire again.
 *
 * Deliberately best-effort. It never throws and never unwinds the
 * assignment: a card that has gone bad since checkout is not a reason to
 * throw away a teammate who just accepted. The hard guarantee still sits on
 * the session start, where setSessionStatus refuses to go in-game on money
 * it could not take — this only moves the attempt earlier, so a teammate
 * finds out before investing time rather than after.
 *
 * Idempotent through captureOrderPayment's own claim, so the later gate is a
 * no-op once this has succeeded.
 */
async function captureOnAssignment(orderId: string): Promise<void> {
  try {
    const result = await captureOrderPayment(orderId);
    if (result.ok) return;
    await logDispatch(
      prisma,
      orderId,
      DISPATCH_EVENT.ASSIGNED,
      `The customer's payment could not be taken yet: ${result.error} The session cannot start until it clears.`,
    );
  } catch {
    // Never at the assignment's expense.
  }
}

/** Guard for the order room: only a selected teammate may read or write it. */
export async function assertAssignedTeammate(orderId: string, teammateId: string) {
  const candidate = await prisma.dispatchCandidate.findUnique({
    where: { orderId_teammateId: { orderId, teammateId } },
  });
  if (!candidate?.selected) throw new DispatchError("This order isn't assigned to you.");
  return candidate;
}


/**
 * Closes an order by hand, from the admin board.
 *
 * completeOrder() is the teammate's route and guards accordingly: it demands
 * the caller be the assigned teammate and every booked game submitted. Those
 * guards are the point of it, and are exactly what an admin resolving a mess
 * needs to step around — a teammate who lost access, a game whose proof never
 * uploaded, a session finished in Discord.
 *
 * The payout is not stepped around. It runs the same creditOrderPayout as a
 * normal completion, so closing an order pays for it, and the ledger's unique
 * (teammateId, orderId, ORDER_PAYOUT) index means an order already paid as a
 * part-way cancellation is not paid a second time here.
 */
export async function forceCompleteOrder(orderId: string, adminLabel: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new DispatchError("Unknown order.");
  if (order.status === "COMPLETED") throw new DispatchError("This order is already closed.");

  const completed = await prisma.$transaction(async (tx) => {
    const closed = await tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", sessionStatus: "ORDER_COMPLETED", sessionCompleteAt: new Date() },
    });

    // Free whoever was on it, so the next wave can reach them again.
    const selected = await tx.dispatchCandidate.findMany({
      where: { orderId, selected: true },
      select: { teammateId: true },
    });
    for (const candidate of selected) {
      await tx.teammate.update({
        where: { id: candidate.teammateId },
        data: { available: true, availableSince: new Date(), sessionsCount: { increment: 1 } },
      });
    }

    await creditOrderPayout(tx, closed);
    await logDispatch(tx, orderId, DISPATCH_EVENT.ENDED, `${adminLabel} closed the order by hand.`);
    return closed;
  });

  await publishOrderChange(orderId);
  void notifyOrderCompleted(orderId);
  return completed;
}

export async function setSessionStatus(orderId: string, teammateId: string, status: string) {
  await assertAssignedTeammate(orderId, teammateId);

  // Going in-game is the moment a guest's reserved money is actually taken —
  // and the gate that stops a session starting on money we cannot get. The
  // card authorised at checkout may have been cancelled or frozen since; a
  // teammate who has to wait is a far better outcome than one who plays a
  // session nobody ends up paying for. Everyone else captured at checkout and
  // passes straight through.
  if (status === "IN_GAME") {
    const captured = await captureOrderPayment(orderId);
    if (!captured.ok) {
      throw new DispatchError(`The customer's payment couldn't be taken (${captured.error}). Don't start yet.`);
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      sessionStatus: status,
      status: status === "IN_GAME" ? "IN_PROGRESS" : undefined,
    },
  });
  await publishOrderChange(orderId);
  return updated;
}

/**
 * Records a finished game. The unique (orderId, gameNumber) index is what
 * actually stops a double submit — two clicks land as one row plus an error,
 * not two games.
 */
export async function recordGame(
  orderId: string,
  teammateId: string,
  game: { gameNumber: number; result: string; note?: string; proofPath?: string | null; proofName?: string | null },
) {
  await assertAssignedTeammate(orderId, teammateId);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new DispatchError("Unknown order.");
  if (order.status === "COMPLETED") throw new DispatchError("This order is already closed.");
  // Re-checked here, not just in the modal — the action is reachable
  // without the UI.
  if (["WIN", "LOSS"].includes(game.result) && !game.proofPath) {
    throw new DispatchError("A result screenshot is required for a played game.");
  }

  try {
    return await prisma.$transaction([
      prisma.sessionGame.create({
        data: {
          orderId,
          gameNumber: game.gameNumber,
          result: game.result,
          note: game.note?.slice(0, 300) || null,
          proofPath: game.proofPath ?? null,
          proofName: game.proofName ?? null,
        },
      }),
      prisma.order.update({ where: { id: orderId }, data: { sessionStatus: "WAITING_FOR_NEXT_GAME" } }),
    ]);
    await publishOrderChange(orderId);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DispatchError("That game was already submitted.");
    }
    throw err;
  }
}

export async function deleteRecordedGame(orderId: string, teammateId: string, gameNumber: number) {
  await assertAssignedTeammate(orderId, teammateId);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "COMPLETED") throw new DispatchError("This order can no longer be edited.");
  const game = await prisma.sessionGame.findUnique({ where: { orderId_gameNumber: { orderId, gameNumber } } });
  if (!game) throw new DispatchError("That game result no longer exists.");
  await prisma.sessionGame.delete({ where: { id: game.id } });
  if (game.proofPath) {
    const { deletePrivateFile } = await import("@/lib/storage");
    await deletePrivateFile(game.proofPath, "proofs").catch(() => undefined);
  }
  await publishOrderChange(orderId);
}

/**
 * Books the teammates' share of a completed order into the earnings ledger
 * and moves their balances.
 *
 * The order's `teammatePayoutEUR` is the whole pot (half the price), split
 * evenly across everyone who actually played it — not 50% per head, which on
 * a three-teammate order would pay out more than the customer paid. Rounding
 * remainders go to the primary so the shares always add back up to the pot.
 *
 * Idempotent: the ledger's unique (teammateId, orderId, ORDER_PAYOUT) index
 * means a replayed completion credits nobody twice, and we skip rows that are
 * already there so the balance isn't moved either.
 */
async function creditOrderPayout(tx: Prisma.TransactionClient, order: { id: string; priceEUR: unknown; teammatePayoutEUR: unknown }) {
  const selected = await tx.dispatchCandidate.findMany({
    where: { orderId: order.id, selected: true },
    select: { teammateId: true, isPrimary: true },
    orderBy: { isPrimary: "desc" },
  });
  if (selected.length === 0) return;

  const alreadyPaid = new Set(
    (
      await tx.teammateEarning.findMany({
        where: { orderId: order.id, type: "ORDER_PAYOUT" },
        select: { teammateId: true },
      })
    ).map((row) => row.teammateId),
  );

  // Split in whole cents so nothing evaporates in floating point.
  const potCents = Math.round(payoutForOrder(order) * 100);
  const baseCents = Math.floor(potCents / selected.length);
  let remainder = potCents - baseCents * selected.length;

  for (const candidate of selected) {
    const cents = baseCents + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    if (alreadyPaid.has(candidate.teammateId) || cents === 0) continue;

    const amountEUR = new Prisma.Decimal(cents).dividedBy(100);
    await tx.teammateEarning.create({
      data: { teammateId: candidate.teammateId, orderId: order.id, type: "ORDER_PAYOUT", amountEUR },
    });
    await tx.teammate.update({
      where: { id: candidate.teammateId },
      data: { balanceEUR: { increment: amountEUR } },
    });
  }
}

export async function completeOrder(orderId: string, teammateId: string, farewell?: string) {
  await assertAssignedTeammate(orderId, teammateId);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { games: true } });
  if (!order) throw new DispatchError("Unknown order.");
  if (order.status === "COMPLETED") throw new DispatchError("This order is already closed.");
  if (order.games.length < order.gamesBooked) {
    throw new DispatchError(`Submit all ${order.gamesBooked} booked game results first.`);
  }

  // Closing the order and paying for it are one atomic step. If the ledger
  // write fails, the order must not end up COMPLETED with nobody credited.
  const completed = await prisma.$transaction(async (tx) => {
    const closed = await tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", sessionStatus: "ORDER_COMPLETED", sessionCompleteAt: new Date() },
    });

    await tx.teammate.update({
      where: { id: teammateId },
      data: { available: true, availableSince: new Date(), lastSeenAt: new Date(), sessionsCount: { increment: 1 } },
    });

    await creditOrderPayout(tx, closed);
    return closed;
  });

  // The "10% off next time" code used to be minted in the browser when the
  // session-complete screen rendered. Earning it is a server-side fact now,
  // so it exists whether or not the customer ever opens that screen.
  await issueSessionRewardCoupon(orderId, completed.clientUserId);

  if (completed.clientUserId) {
    await notifyUser(completed.clientUserId, {
      type: "order.completed",
      title: "Your session is complete",
      body: (farewell ?? "GG!").trim().slice(0, 80) || "GG!",
      href: `/checkout/matching?order=${completed.orderNo}`,
    });
  }
  // after(), not awaited: the teammate pressing "complete" should not wait
  // on an SMTP handshake, and a floating promise would be dropped when the
  // response ends the request.
  after(() => notifyOrderCompleted(orderId));

  // Said plainly, because the old wording — "payout is pending review" — was
  // simply untrue. creditOrderPayout ran in the transaction above; the money
  // is on the teammate's balance the moment the order closes and nothing is
  // waiting on anybody. What can be reviewed later is a payout *request*,
  // which the teammate raises separately and which does not exist yet, so the
  // link pointed at a queue with nothing in it for this order.
  await notifyAdmins({
    type: "order.completed",
    title: `Order completed · ${completed.gameName}`,
    body: `${completed.option} — €${payoutForOrder(completed).toFixed(2)} credited to the teammate's balance.`,
    href: `/dashboard/admin/orders/${completed.orderNo}`,
  });

  await publishOrderChange(orderId);
  return completed;
}

/**
 * Advances every open search this teammate could be part of.
 *
 * Replaces the old self-invitation top-up, which let anyone opening their
 * panel add themselves to a running order — harmless when the wave was picked
 * once at dispatch, but it walks straight past a dispatcher that is supposed
 * to decide who gets asked and in what order.
 *
 * The pool is recomputed for every wave, so coming online is still enough to
 * be considered; the difference is that the dispatcher now does the
 * considering. What this call is for is the clock: waves are eight seconds
 * long and nothing in this deployment ticks on its own, so a read is what
 * moves them. Capped, because it runs on every panel read.
 */
export async function tickSearchingOrders(teammateId: string): Promise<void> {
  const teammate = await prisma.teammate.findUnique({
    where: { id: teammateId },
    select: { available: true, gameSlugs: true },
  });
  if (!teammate?.available) return;

  const gameSlugs = (teammate.gameSlugs as string[] | null) ?? [];
  if (gameSlugs.length === 0) return;

  // Only orders whose wave clock has actually run out. Reconciling every
  // open order on every panel read meant one teammate refreshing their
  // dashboard did five transactions' worth of work to discover that nothing
  // had changed — multiplied by every teammate with the panel open. The
  // filter is the whole point: almost always this query returns nothing and
  // the call costs one indexed read.
  const now = new Date();
  const due = await prisma.order.findMany({
    where: {
      status: { in: ["SEARCHING", "CANDIDATES_READY"] },
      gameSlug: { in: gameSlugs },
      matchingPaused: false,
      OR: [{ waveDeadline: null }, { waveDeadline: { lte: now } }],
    },
    select: { id: true },
    orderBy: { dispatchedAt: "asc" },
    take: 3,
  });

  for (const order of due) await reconcileOrder(order.id);
}

/** Everything the teammate dashboard needs in one read. */
export async function getTeammateDispatchView(teammateId: string) {
  // Turns the wave clock on anything this teammate could be sent. They may
  // well end up in the wave this call sends.
  await tickSearchingOrders(teammateId).catch((err) => {
    console.error("[dispatch] wave tick failed:", teammateId, err);
  });

  const rows = await prisma.dispatchCandidate.findMany({
    where: {
      teammateId,
      order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING", "ASSIGNED", "IN_PROGRESS"] } },
    },
    include: { order: { include: { candidates: true, games: true } } },
    orderBy: { invitedAt: "desc" },
  });

  // Cheap catch-up: the clock-driven transitions only need to happen when
  // somebody actually looks, and there's no scheduler in this deployment.
  for (const row of rows) await reconcileOrder(row.orderId);

  return prisma.dispatchCandidate.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { order: { include: { candidates: true, games: true } } },
    orderBy: { invitedAt: "desc" },
  });
}
