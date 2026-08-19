"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { acceptHandover, createHandover, declineHandover, revokeHandover } from "@/lib/orderHandover";

async function requireTeammate() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
  if (!teammate) throw new Error("No teammate profile linked to this account.");
  return teammate;
}

// Same shape as dispatchActions: a result object rather than a throw across
// the server-action boundary, because the panel shows these messages verbatim.
type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function createHandoverAction(
  orderId: string,
  note?: string | null,
): Promise<Result<{ url: string; expiresAt: number }>> {
  try {
    const teammate = await requireTeammate();
    const handover = await createHandover(orderId, teammate.id, note);
    revalidatePath(`/dashboard/teammate/session/${orderId}`);
    // A relative path, not an absolute URL: the panel is what pastes this
    // into a clipboard, and it knows its own origin. Building it here would
    // mean trusting an env var that is set in some environments and not
    // others, and getting it wrong yields a link that silently goes nowhere.
    return { ok: true, url: `/handover/${handover.token}`, expiresAt: handover.expiresAt.getTime() };
  } catch (err) {
    return fail(err);
  }
}

export async function revokeHandoverAction(handoverId: string, orderId: string): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await revokeHandover(handoverId, teammate.id);
    revalidatePath(`/dashboard/teammate/session/${orderId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function acceptHandoverAction(token: string): Promise<Result<{ orderId: string }>> {
  try {
    const teammate = await requireTeammate();
    const order = await acceptHandover(token, teammate.id);
    revalidatePath("/dashboard/teammate");
    return { ok: true, orderId: order.id };
  } catch (err) {
    return fail(err);
  }
}

export async function declineHandoverAction(token: string): Promise<Result> {
  try {
    const teammate = await requireTeammate();
    await declineHandover(token, teammate.id);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
