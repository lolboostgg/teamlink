"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/events/bus";
import {
  respondToDispatch,
  setSessionStatus,
  recordGame,
  deleteRecordedGame,
  completeOrder,
  withdrawDispatchAcceptance,
  DispatchError,
} from "@/lib/dispatch/service";

async function requireTeammate() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
  if (!teammate) throw new Error("No teammate profile linked to this account.");
  return teammate;
}

export async function withdrawDispatchAction(orderId: string): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await withdrawDispatchAcceptance(orderId, teammate.id);
    revalidatePath("/dashboard/teammate");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// Server actions return a result object rather than throwing across the
// boundary — the dashboard shows these messages verbatim.
type Result = { ok: true } | { ok: false; error: string };

function fail(err: unknown): Result {
  if (err instanceof DispatchError) return { ok: false, error: err.message };
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function respondToDispatchAction(orderId: string, accept: boolean): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    if (!teammate.available && accept) {
      return { ok: false, error: "Go online before accepting orders." };
    }
    await respondToDispatch(orderId, teammate.id, accept);
    revalidatePath("/dashboard/teammate");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setSessionStatusAction(orderId: string, status: string): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await setSessionStatus(orderId, teammate.id, status);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function recordGameAction(
  orderId: string,
  game: { gameNumber: number; result: string; note?: string; proofPath?: string | null; proofName?: string | null },
): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await recordGame(orderId, teammate.id, game);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteGameAction(orderId: string, gameNumber: number): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await deleteRecordedGame(orderId, teammate.id, gameNumber);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function completeOrderAction(orderId: string, farewell?: string): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await completeOrder(orderId, teammate.id, farewell);
    revalidatePath("/dashboard/teammate");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Answers a customer's cancellation request. Until this existed the request
 * only ever moved the order to CANCEL_PENDING, which nothing could move it
 * back out of — the customer sat on "waiting for your teammate to confirm"
 * indefinitely and the session was stuck with it.
 */
export async function respondToCancelAction(orderId: string, approve: boolean): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    // Which teammate is "on" an order lives on the candidate rows, not the
    // order itself — see the note above the Order model.
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        status: "CANCEL_PENDING",
        candidates: { some: { teammateId: teammate.id, selected: true } },
      },
    });
    if (!order) return { ok: false, error: "No open cancellation request on this order." };

    await prisma.order.update({
      where: { id: orderId },
      data: approve
        ? { status: "CANCELLED", cancelApprovedAt: new Date() }
        : // sessionStatus was never touched by the request, so declining
          // simply hands the session back at the stage it was already at.
          { status: "IN_PROGRESS" },
    });

    if (order.clientUserId) {
      await publish({ topic: "orders", key: orderId, userIds: [order.clientUserId] });
    }
    revalidatePath("/dashboard/teammate");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setOnlineAction(online: boolean): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    const now = new Date();
    await prisma.teammate.update({
      where: { id: teammate.id },
      data: {
        available: online,
        availableSince: online ? (teammate.availableSince ?? now) : null,
        lastSeenAt: online ? now : teammate.lastSeenAt,
      },
    });
    revalidatePath("/dashboard/teammate");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
