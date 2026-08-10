"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { DISPATCH_EVENT, logDispatch } from "@/lib/dispatch/log";
import { forceCompleteOrder, DispatchError, publishOrderChange } from "@/lib/dispatch/service";
import { settleCancelledOrder, refundOrder } from "@/lib/orderRefunds";
import { notifyUser } from "@/lib/notifications/service";
import { requireAdmin as requireScopedAdmin } from "@/lib/admin/access";

/**
 * What an admin can do to an order the ordinary flow has got stuck on.
 *
 * Everything here writes a log entry naming the admin. An order steered by
 * hand looks exactly like one the system decided on unless somebody says
 * otherwise, and the refund questions arrive weeks later.
 */

type Result = { ok: true; message: string } | { ok: false; error: string };

async function requireAdmin(): Promise<string> {
  const { user } = await requireScopedAdmin("support");
  return user.name ?? user.email ?? "an admin";
}

function fail(err: unknown): Result {
  if (err instanceof DispatchError) return { ok: false, error: err.message };
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

const SETTLED = new Set(["COMPLETED", "CANCELLED", "NO_MATCH"]);

export type CancelMode = "proportional" | "full" | "custom" | "none";

/**
 * Cancels an order and decides what goes back.
 *
 * - `proportional` leaves it to the per-game split, the same arithmetic the
 *   teammate's approval uses: only the games the customer never got.
 * - `full` gives everything back regardless of what was played — the goodwill
 *   answer to a complaint.
 * - `custom` is an exact figure, capped at what was actually paid.
 * - `none` cancels without returning anything, for an order that was already
 *   settled some other way.
 *
 * Where the money lands is not a choice here: an account is credited, a guest
 * is refunded or has their hold released. That follows the customer, not the
 * admin — see settleCancelledOrder.
 */
export async function adminCancelOrder(
  orderId: string,
  mode: CancelMode,
  customEUR?: number,
): Promise<Result> {
  try {
    const admin = await requireAdmin();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true, clientUserId: true, gameName: true, priceEUR: true, status: true },
    });
    if (!order) return { ok: false, error: "Unknown order." };
    if (SETTLED.has(order.status)) return { ok: false, error: `This order is already ${order.status.toLowerCase()}.` };

    let overrideCents: number | undefined;
    if (mode === "full") overrideCents = Math.round(Number(order.priceEUR) * 100);
    if (mode === "none") overrideCents = 0;
    if (mode === "custom") {
      if (!Number.isFinite(customEUR) || (customEUR as number) < 0) {
        return { ok: false, error: "Enter a refund amount." };
      }
      overrideCents = Math.round((customEUR as number) * 100);
    }

    await prisma.$transaction(async (tx) => {
      await tx.dispatchCandidate.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: "SUPERSEDED", respondedAt: new Date() },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", matchingPaused: false, cancelApprovedAt: new Date() },
      });
      await logDispatch(tx, orderId, DISPATCH_EVENT.ENDED, `${admin} cancelled the order (${mode} refund).`);
    });

    // Outside the transaction: it talks to Stripe and to a mail server.
    const outcome = await settleCancelledOrder(order, "cancelled_by_admin", overrideCents);

    // Everyone on the order, not admins only — this is the customer's own
    // cancellation landing, and they were the one person it never reached.
    await publishOrderChange(orderId);
    // By number, since that is the URL the page is served at — revalidating
    // the id would name a path nobody is looking at.
    revalidatePath(`/dashboard/admin/orders/${order.orderNo}`);

    const amount = `€${(outcome.cents / 100).toFixed(2)}`;
    if (outcome.problem) return { ok: false, error: `Cancelled, but the refund failed: ${outcome.problem}` };
    if (outcome.cents === 0) return { ok: true, message: "Order cancelled. Nothing was returned." };
    return {
      ok: true,
      message:
        outcome.method === "credit"
          ? `Order cancelled. ${amount} credited to the customer's balance.`
          : outcome.method === "released"
            ? `Order cancelled. The ${amount} hold was released.`
            : `Order cancelled. ${amount} refunded to the customer.`,
    };
  } catch (err) {
    return fail(err);
  }
}

/** Closes an order the teammate could not close themselves. Pays it out. */
export async function adminCompleteOrder(orderId: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    const closed = await forceCompleteOrder(orderId, admin);
    revalidatePath(`/dashboard/admin/orders/${closed.orderNo}`);
    return { ok: true, message: "Order closed and paid out." };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Swaps the teammate on a live order.
 *
 * The gap this fills: a teammate who stops answering mid-session left an
 * admin with exactly one lever, adminCancelOrder, so a customer whose
 * teammate vanished got their money back instead of a session. This keeps the
 * order and changes who is on it.
 *
 * Everything happens in one transaction because the two halves are one fact:
 * the outgoing candidate stops being selected and the incoming one starts.
 * Half of that committed is an order with nobody on it or two people on it.
 *
 * The replacement's earning row is not written here — completion still does
 * that, against whoever holds the seat when the session ends, which is
 * exactly right. What the outgoing teammate has already earned stays theirs.
 */
export async function reassignTeammate(orderId: string, newTeammateId: string): Promise<Result> {
  try {
    const admin = await requireAdmin();

    const [order, replacement] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNo: true,
          status: true,
          gameSlug: true,
          gameName: true,
          candidates: { where: { selected: true }, select: { id: true, teammateId: true, isPrimary: true } },
        },
      }),
      prisma.teammate.findUnique({
        where: { id: newTeammateId },
        select: { id: true, name: true, userId: true, available: true, gameSlugs: true },
      }),
    ]);

    if (!order) return { ok: false, error: "That order is gone." };
    if (SETTLED.has(order.status)) return { ok: false, error: "This order has already finished." };
    if (!replacement) return { ok: false, error: "That teammate does not exist." };
    if (order.candidates.some((candidate) => candidate.teammateId === newTeammateId)) {
      return { ok: false, error: `${replacement.name} is already on this order.` };
    }

    // Warned about rather than blocked: an admin reaching for this is
    // handling something the ordinary rules did not cover, and "not listed
    // for this game" is a reason to think twice, not a wall.
    const slugs = Array.isArray(replacement.gameSlugs) ? (replacement.gameSlugs as string[]) : [];
    const notListed = !slugs.includes(order.gameSlug);

    const outgoing = order.candidates[0] ?? null;

    await prisma.$transaction(async (tx) => {
      if (outgoing) {
        await tx.dispatchCandidate.update({
          where: { id: outgoing.id },
          data: { selected: false, isPrimary: false, status: "SUPERSEDED", respondedAt: new Date() },
        });
      }

      await tx.dispatchCandidate.upsert({
        where: { orderId_teammateId: { orderId, teammateId: newTeammateId } },
        create: {
          orderId,
          teammateId: newTeammateId,
          invitedAt: new Date(),
          wave: 0,
          status: "ACCEPTED",
          respondedAt: new Date(),
          manual: true,
          selected: true,
          selectedAt: new Date(),
          isPrimary: true,
          candidatePosition: 1,
        },
        update: {
          status: "ACCEPTED",
          respondedAt: new Date(),
          manual: true,
          selected: true,
          selectedAt: new Date(),
          isPrimary: true,
        },
      });

      await tx.teammate.update({ where: { id: newTeammateId }, data: { lastAssignedAt: new Date() } });

      await logDispatch(
        tx,
        orderId,
        DISPATCH_EVENT.ADMIN,
        `${admin} moved the order to ${replacement.name}${notListed ? " (not listed for this game)" : ""}.`,
        { teammateId: newTeammateId },
      );
    });

    await publishOrderChange(orderId);

    // The new teammate has to find out, and they are the one person who
    // cannot see the admin log. Same event the ordinary selection sends, so
    // it reaches their Discord too (see notify/channels.ts).
    if (replacement.userId) {
      await notifyUser(replacement.userId, {
        type: "order.assigned",
        title: "You've been put on an order",
        body: `An admin moved order #${order.orderNo} (${order.gameName}) to you.`,
        href: `/dashboard/teammate/session/${order.orderNo}`,
      }).catch(() => undefined);
    }

    return {
      ok: true,
      message: notListed
        ? `Moved to ${replacement.name} — note they are not listed for ${order.gameName}.`
        : `Moved to ${replacement.name}.`,
    };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Pays a refund by hand, from the page the alert points at.
 *
 * order.refund_due exists for the case where the automatic refund failed, and
 * until now it linked to a screen that could only look at the problem: the
 * actual fix was in the Stripe dashboard, in another tab, by somebody who had
 * to work out which payment intent it was. This runs the same refund path the
 * automatic one uses, so an account is credited and a guest is refunded to
 * source, and it books the attempt into the log either way.
 */
export async function manualRefund(orderId: string, amountEUR: number): Promise<Result> {
  try {
    const admin = await requireAdmin();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNo: true,
        clientUserId: true,
        gameName: true,
        priceEUR: true,
      },
    });
    if (!order) return { ok: false, error: "That order is gone." };

    const cents = Math.round(amountEUR * 100);
    if (!Number.isFinite(cents) || cents <= 0) return { ok: false, error: "Enter an amount above zero." };

    // refundOrder caps at what was actually taken, so an admin cannot hand
    // back more than came in even by typing it.
    const outcome = await refundOrder(
      {
        id: order.id,
        orderNo: order.orderNo,
        clientUserId: order.clientUserId,
        gameName: order.gameName,
        priceEUR: Number(order.priceEUR),
      },
      "cancelled_by_admin",
      cents,
    );

    const paid = `€${(outcome.cents / 100).toFixed(2)}`;
    await logDispatch(
      prisma,
      orderId,
      DISPATCH_EVENT.ADMIN,
      outcome.problem
        ? `${admin} tried to refund ${paid} by hand and it failed: ${outcome.problem}`
        : `${admin} refunded ${paid} by hand (${outcome.method}).`,
    );

    if (outcome.problem) return { ok: false, error: `Refund failed: ${outcome.problem}` };

    revalidatePath(`/dashboard/admin/orders/${order.orderNo}`);
    return {
      ok: true,
      message: outcome.method === "credit" ? `${paid} credited to their balance.` : `${paid} refunded to their card.`,
    };
  } catch (err) {
    return fail(err);
  }
}
