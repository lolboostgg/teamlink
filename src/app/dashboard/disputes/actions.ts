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

/**
 * The reporter's own ticket, loaded for a follow-up action.
 *
 * Ownership is the whole check: a ticket belongs to whoever opened it, and
 * neither replying nor closing is something an admin does from this side —
 * they have their own page with their own audit trail.
 */
async function ownTicket(ticketId: string, userId: string) {
  const ticket = await prisma.dispute.findUnique({ where: { id: ticketId } });
  return ticket && ticket.openedById === userId ? ticket : null;
}

/**
 * A reply from the person who opened the ticket.
 *
 * Replying to a solved ticket reopens it. That is the behaviour every support
 * inbox has, and it is the reason there is no separate "reopen" button: if it
 * was not actually fixed, the thing somebody wants to do is say so, and
 * making them push a button first before they can is a step that exists only
 * to serve the data model.
 */
export async function replyToTicket(_previous: TicketFormState, formData: FormData): Promise<TicketFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first.", at: Date.now() };

  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 3000);
  if (!body) return { error: "Write a message first.", at: Date.now() };

  const ticket = await ownTicket(ticketId, session.user.id);
  if (!ticket) return { error: "That ticket isn't yours.", at: Date.now() };

  try {
    await enforceRateLimit(`dispute-reply:${session.user.id}`, 20, 60 * 60 * 1000);
  } catch {
    return { error: "That's a lot of messages at once. Give us a moment to catch up.", at: Date.now() };
  }

  const reopened = ticket.status === "SOLVED";
  await prisma.$transaction(async (tx) => {
    await tx.disputeNote.create({
      data: { disputeId: ticketId, authorId: session.user!.id!, authorRole: session.user!.role as "CLIENT" | "TEAMMATE" | "ADMIN", internal: false, body },
    });
    // Touching updatedAt is what floats the ticket back to the top of the
    // admin queue, which is sorted by it — a reply nobody sees is a reply
    // that did not happen.
    await tx.dispute.update({
      where: { id: ticketId },
      data: reopened
        ? { status: "PENDING", closedByReporter: false, resolvedAt: null, updatedAt: new Date() }
        : { updatedAt: new Date() },
    });
  });

  await notifyAdmins({
    type: "dispute.replied",
    title: reopened ? `Ticket reopened · ${ticket.title}` : `Reply on ticket · ${ticket.title}`,
    body: body.length > 160 ? `${body.slice(0, 157)}…` : body,
    href: `/dashboard/admin/disputes?ticket=${ticketId}`,
  });

  revalidatePath("/dashboard/admin/disputes");
  revalidatePath(`/dashboard/${session.user.role.toLowerCase()}/disputes`);
  return { ok: true, at: Date.now() };
}

/**
 * The reporter closing their own ticket.
 *
 * Deliberately not the same thing as support resolving one: nothing is
 * refunded, credited or sanctioned here, and `closedByReporter` records which
 * of the two happened so the card can say so. Somebody whose problem sorted
 * itself out should be able to say that without waiting for an admin, and an
 * admin should be able to stop working on it.
 */
export async function closeOwnTicket(ticketId: string): Promise<TicketFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in first.", at: Date.now() };

  const ticket = await ownTicket(ticketId, session.user.id);
  if (!ticket) return { error: "That ticket isn't yours.", at: Date.now() };
  if (ticket.status === "SOLVED") return { ok: true, at: Date.now() };

  await prisma.dispute.update({
    where: { id: ticketId },
    data: { status: "SOLVED", closedByReporter: true, resolvedAt: new Date() },
  });

  // Told, not asked: an admin halfway through investigating this should find
  // out now rather than at the end of the work nobody needs any more.
  await notifyAdmins({
    type: "dispute.closed",
    title: `Ticket closed by the reporter · ${ticket.title}`,
    body: "They closed it themselves — no resolution was recorded.",
    href: `/dashboard/admin/disputes?ticket=${ticketId}`,
  });

  revalidatePath("/dashboard/admin/disputes");
  revalidatePath(`/dashboard/${session.user.role.toLowerCase()}/disputes`);
  return { ok: true, at: Date.now() };
}
