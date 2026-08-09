"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DISPATCH_EVENT, logDispatch } from "@/lib/dispatch/log";
import { forceCompleteOrder, DispatchError, publishOrderChange } from "@/lib/dispatch/service";
import { settleCancelledOrder } from "@/lib/orderRefunds";

/**
 * What an admin can do to an order the ordinary flow has got stuck on.
 *
 * Everything here writes a log entry naming the admin. An order steered by
 * hand looks exactly like one the system decided on unless somebody says
 * otherwise, and the refund questions arrive weeks later.
 */

type Result = { ok: true; message: string } | { ok: false; error: string };

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden — admin only.");
  return session.user.name ?? session.user.email ?? "an admin";
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
