"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  respondToDispatch,
  setSessionStatus,
  recordGame,
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

export async function completeOrderAction(orderId: string): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await completeOrder(orderId, teammate.id);
    revalidatePath("/dashboard/teammate");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setOnlineAction(online: boolean): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await prisma.teammate.update({ where: { id: teammate.id }, data: { available: online } });
    revalidatePath("/dashboard/teammate");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
