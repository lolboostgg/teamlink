"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/events/bus";
import { DISPATCH_EVENT, logDispatch } from "@/lib/dispatch/log";
import { assignWinners, reconcileOrder, publishOrderChange } from "@/lib/dispatch/service";
import { notifyUser } from "@/lib/notifications/service";
import { sendWave, resetForRetry } from "@/lib/dispatch/waves";
import { settleCancelledOrder } from "@/lib/orderRefunds";

/**
 * Manual controls over a live dispatch.
 *
 * Every one of these writes a log entry naming the admin. An order that was
 * steered by hand looks exactly like one the dispatcher decided on its own
 * unless someone says otherwise, and six weeks later nobody remembers.
 */

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden — admin only.");
  return session.user.name ?? session.user.email ?? "an admin";
}

function fail(err: unknown): Result {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

/** Stops further waves. Alerts already on screen stay live. */
export async function setMatchingPaused(orderId: string, paused: boolean): Promise<Result> {
  try {
    const admin = await requireAdmin();
    await prisma.order.update({ where: { id: orderId }, data: { matchingPaused: paused } });
    await logDispatch(
      prisma,
      orderId,
      DISPATCH_EVENT.ADMIN,
      paused ? `Matching paused by ${admin}.` : `Matching resumed by ${admin}.`,
    );
    await publishOrderChange(orderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Sends the next wave immediately instead of waiting out the current one.
 *
 * Also the "add candidates" button: a wave is exactly a group of extra
 * candidates, so there is no second mechanism for it.
 */
export async function forceNextWave(orderId: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    const now = new Date();
    const invited = await prisma.$transaction(async (tx) => {
      await logDispatch(tx, orderId, DISPATCH_EVENT.ADMIN, `${admin} sent the next wave by hand.`);
      const result = await sendWave(tx, orderId, now);
      return result.invited;
    });
    if (invited.length === 0) return { ok: false, error: "Nobody eligible is left to invite right now." };
    await publish({
      topic: "dispatch",
      key: orderId,
      userIds: invited.map((t) => t.userId).filter((id): id is string => Boolean(id)),
    });
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Releases every lapsed invitation so the whole roster can be asked again. */
export async function restartDispatch(orderId: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    const now = new Date();
    const invited = await prisma.$transaction(async (tx) => {
      await logDispatch(tx, orderId, DISPATCH_EVENT.ADMIN, `${admin} restarted the dispatch.`);
      await resetForRetry(tx, orderId, now);
      const result = await sendWave(tx, orderId, now);
      return result.invited;
    });
    await publish({
      topic: "dispatch",
      key: orderId,
      userIds: invited.map((t) => t.userId).filter((id): id is string => Boolean(id)),
    });
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Puts a teammate on the order outright, whether or not they were ever
 * invited — the escape hatch for "the customer asked for this person in a
 * support chat".
 */
export async function forceSelect(orderId: string, teammateId: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const teammate = await tx.teammate.findUnique({ where: { id: teammateId }, select: { name: true } });
      if (!teammate) throw new Error("No such teammate.");

      const candidate = await tx.dispatchCandidate.upsert({
        where: { orderId_teammateId: { orderId, teammateId } },
        create: {
          orderId,
          teammateId,
          status: "ACCEPTED",
          invitedAt: now,
          respondedAt: now,
          manual: true,
          candidatePosition: 1,
        },
        update: { status: "ACCEPTED", respondedAt: now, manual: true },
      });

      await assignWinners(tx, orderId, [candidate.id], now);
      await logDispatch(tx, orderId, DISPATCH_EVENT.ADMIN, `${admin} assigned ${teammate.name} directly.`, {
        teammateId,
      });
    });

    // Addressed to everyone on the order, not `userIds: []` — that reaches
    // admins only (see lib/events/bus.ts), so the teammate who had just been
    // put on an order learned about it from their slow fallback poll, up to a
    // minute later. The push is what makes DispatchFlow route them straight
    // into the order room; without it the assignment simply didn't arrive.
    await publishOrderChange(orderId);

    // The bell as well as the push: a teammate who had the dashboard closed
    // gets mail/Discord out of this (see notify/channels.ts) instead of
    // finding the order whenever they next happen to look.
    const [teammate, order] = await Promise.all([
      prisma.teammate.findUnique({ where: { id: teammateId }, select: { userId: true } }),
      prisma.order.findUnique({ where: { id: orderId }, select: { orderNo: true, gameName: true } }),
    ]);
    if (teammate?.userId && order) {
      await notifyUser(teammate.userId, {
        type: "order.assigned",
        title: `You're on order #${order.orderNo}`,
        body: `${admin} put you on this ${order.gameName} order — the customer is waiting in the chat.`,
        href: `/dashboard/teammate/session/${order.orderNo}`,
      });
    }

    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Takes a teammate back off an order and puts the search back on. */
export async function removeCandidate(orderId: string, teammateId: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const teammate = await tx.teammate.findUnique({ where: { id: teammateId }, select: { name: true } });
      await tx.dispatchCandidate.deleteMany({ where: { orderId, teammateId } });
      const remaining = await tx.dispatchCandidate.count({ where: { orderId, selected: true } });
      if (remaining === 0) {
        // Back to searching rather than left ASSIGNED with nobody on it —
        // an assigned order with no teammate is invisible to the dispatcher
        // and to the customer both.
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANDIDATES_READY", assignedAt: null, sessionStatus: null, waveDeadline: null },
        });
      }
      await logDispatch(
        tx,
        orderId,
        DISPATCH_EVENT.ADMIN,
        `${admin} removed ${teammate?.name ?? "a teammate"} from the order.`,
        { teammateId },
      );
    });
    await publishOrderChange(orderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Buys the customer another selection window. */
export async function extendSelection(orderId: string, seconds = 60): Promise<Result> {
  try {
    const admin = await requireAdmin();
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { selectionDeadline: true } });
    // From now, not from the old deadline: an expired window extended by its
    // own end is still expired.
    const base = Math.max(Date.now(), order?.selectionDeadline?.getTime() ?? 0);
    await prisma.order.update({
      where: { id: orderId },
      data: { selectionDeadline: new Date(base + seconds * 1000) },
    });
    await logDispatch(prisma, orderId, DISPATCH_EVENT.ADMIN, `${admin} gave the customer ${seconds}s more to pick.`);
    await publishOrderChange(orderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Corrects what the customer typed at checkout — these drive the filters. */
export async function correctOrderDetails(
  orderId: string,
  input: { ignRank?: string | null; ignDivision?: string | null; ignRegion?: string | null },
): Promise<Result> {
  try {
    const admin = await requireAdmin();
    await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(input.ignRank !== undefined ? { ignRank: input.ignRank || null } : {}),
        ...(input.ignDivision !== undefined ? { ignDivision: input.ignDivision || null } : {}),
        ...(input.ignRegion !== undefined ? { ignRegion: input.ignRegion || null } : {}),
      },
    });
    await logDispatch(
      prisma,
      orderId,
      DISPATCH_EVENT.ADMIN,
      `${admin} corrected the order details — the next wave uses the new filters.`,
      { detail: input },
    );
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cancelDispatch(orderId: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    const cancelled = await prisma.$transaction(async (tx) => {
      await tx.dispatchCandidate.updateMany({
        where: { orderId, status: "PENDING" },
        // Superseded, not timed out: nobody here failed to answer, the order
        // was taken off the table under them.
        data: { status: "SUPERSEDED", respondedAt: new Date() },
      });
      const before = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
      const row = await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", matchingPaused: false },
        select: { id: true, orderNo: true, clientUserId: true, gameName: true, priceEUR: true },
      });
      await logDispatch(tx, orderId, DISPATCH_EVENT.ENDED, `${admin} cancelled the order from the dispatch board.`);
      // An order the admin pulls off the board is one the customer paid for
      // and will not get. It used to end here with the money kept and nobody
      // told; the refund now runs once this commits.
      return before?.status === "AWAITING_PAYMENT" || before?.status === "CANCELLED" ? null : row;
    });
    if (cancelled) await settleCancelledOrder(cancelled, "cancelled_by_admin");
    await publishOrderChange(orderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Nudges one order's clock, for the refresh button on the board. */
export async function tickOrder(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    await reconcileOrder(orderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
