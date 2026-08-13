"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/admin/rateLimit";
import { notifyAdmins } from "@/lib/notifications/service";

/**
 * What the ticket form gets back.
 *
 * Returned rather than thrown: a thrown server action reaches the customer as
 * the framework's generic error screen, which loses whatever they had typed
 * and tells them nothing about which field was wrong. `at` exists so a second
 * identical failure still re-renders — two submissions with the same message
 * are otherwise indistinguishable to React and the message looks stuck.
 */
export type TicketFormState = { ok?: boolean; error?: string; at?: number };

export async function openDispute(_previous: TicketFormState, formData: FormData): Promise<TicketFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first.", at: Date.now() };

  const orderId = String(formData.get("orderId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 3000);
  if (!orderId) return { error: "Choose the order this is about.", at: Date.now() };
  if (!title) return { error: "Give the ticket a short summary.", at: Date.now() };
  if (description.length < 10) return { error: "Describe what happened in a little more detail.", at: Date.now() };

  // After the cheap validation, not before: a typo in the form should not
  // burn one of the five tickets an hour somebody is allowed to open.
  try {
    await enforceRateLimit(`dispute:${session.user.id}`, 5, 60 * 60 * 1000);
  } catch {
    return { error: "You've opened several tickets recently. Try again in a little while.", at: Date.now() };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNo: true, gameName: true, clientUserId: true, candidates: { where: { selected: true }, select: { teammate: { select: { userId: true } } } } },
  });
  if (!order) return { error: "That order no longer exists.", at: Date.now() };
  const ownsOrder = order.clientUserId === session.user.id || order.candidates.some((candidate) => candidate.teammate.userId === session.user.id);
  if (!ownsOrder && session.user.role !== "ADMIN") return { error: "That order isn't yours.", at: Date.now() };

  const ticket = await prisma.dispute.create({
    data: { orderId, openedById: session.user.id, openedByRole: session.user.role as "CLIENT" | "TEAMMATE" | "ADMIN", title, description },
  });

  // Support is the one queue where nobody is watching a dispatch panel, so a
  // new ticket has to come and find an admin rather than wait to be noticed.
  // notifyAdmins writes the bell row for every admin and hands the external
  // fan-out to after(), so the Discord round trip is not in front of the
  // customer's own submit.
  const who = session.user.role === "TEAMMATE" ? "Teammate" : "Customer";
  await notifyAdmins({
    type: "dispute.opened",
    title: `New support ticket · #${order.orderNo}`,
    body: `${who}: ${title}`,
    href: `/dashboard/admin/disputes?ticket=${ticket.id}`,
    fields: [
      { name: "Order", value: `#${order.orderNo} · ${order.gameName}`, inline: true },
      { name: "Opened by", value: who, inline: true },
    ],
  });

  revalidatePath("/dashboard/admin/disputes");
  revalidatePath(`/dashboard/${session.user.role.toLowerCase()}/disputes`);
  return { ok: true, at: Date.now() };
}
