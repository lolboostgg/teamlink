"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { writeAudit } from "@/lib/admin/audit";
import { manualRefund } from "@/app/dashboard/admin/orders/actions";
import { adjustClientCredit } from "@/app/dashboard/admin/accounts/actions";
import { notifyUser } from "@/lib/notifications/service";

/**
 * Where the person who opened a ticket reads it.
 *
 * A dispute records the role it was opened under, and the two dashboards live
 * at different paths — linking a teammate at the client page is a dead end,
 * and the bell is useless if its link goes nowhere.
 */
function ticketHref(openedByRole: string): string {
  return openedByRole === "TEAMMATE" ? "/dashboard/teammate/disputes" : "/dashboard/client/disputes";
}

/** Plain-language status, for a notification the customer actually reads. */
const STATUS_SAID: Record<string, string> = {
  OPEN: "reopened",
  INVESTIGATING: "being looked into",
  WAITING: "waiting on your reply",
  RESOLVED: "resolved",
};

export async function updateDispute(formData: FormData) {
  const { user } = await requireAdmin("support");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "OPEN") as "OPEN" | "INVESTIGATING" | "WAITING" | "RESOLVED";
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  const before = await prisma.dispute.findUnique({ where: { id } });
  if (!before) throw new Error("Dispute not found.");
  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({ where: { id }, data: { status, assigneeId, resolvedAt: status === "RESOLVED" ? new Date() : null } });
    if (note) await tx.disputeNote.create({ data: { disputeId: id, authorId: user.id, internal: true, body: note } });
  });
  await writeAudit({ actorId: user.id, action: "dispute.updated", entityType: "Dispute", entityId: id, reason: note, before: { status: before.status, assigneeId: before.assigneeId }, after: { status, assigneeId } });

  // Only a status the reporter can see the point of. Assigning the ticket to
  // a different admin, or filing an internal note, is bookkeeping — telling
  // somebody their ticket "changed" when nothing about it changed for them is
  // how a notification feed gets muted.
  if (status !== before.status) {
    await notifyUser(before.openedById, {
      type: "dispute.updated",
      title: `Your ticket is ${STATUS_SAID[status] ?? status.toLowerCase()}`,
      body: before.title,
      href: ticketHref(before.openedByRole),
    });
  }
  revalidatePath("/dashboard/admin/disputes");
  revalidatePath(ticketHref(before.openedByRole));
}

export async function resolveDispute(formData: FormData) {
  const { user } = await requireAdmin("finance");
  const id = String(formData.get("id") ?? "");
  const resolution = String(formData.get("resolution") ?? "REJECTED") as "REFUND" | "PARTIAL_REFUND" | "CREDIT" | "REJECTED" | "OTHER" | "TEAMMATE_NO_SHOW";
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  const amount = Math.max(0, Number(formData.get("amountEUR") ?? 0));
  if (!note) throw new Error("A resolution needs a note.");
  const dispute = await prisma.dispute.findUnique({ where: { id }, include: { notes: false } });
  if (!dispute) throw new Error("Dispute not found.");

  if ((resolution === "REFUND" || resolution === "PARTIAL_REFUND") && dispute.orderId) {
    const refund = await manualRefund(dispute.orderId, resolution === "REFUND" ? 999999 : amount);
    if (!refund.ok) throw new Error(refund.error);
  } else if (resolution === "CREDIT") {
    if (amount <= 0) throw new Error("Enter a credit amount.");
    await adjustClientCredit({ userId: dispute.openedById, amountEUR: amount, direction: "add", reason: note });
  }
  if (resolution === "TEAMMATE_NO_SHOW" && dispute.orderId) {
    const selected = await prisma.dispatchCandidate.findMany({ where: { orderId: dispute.orderId, selected: true }, select: { teammateId: true } });
    for (const candidate of selected) {
      const prior = await prisma.teammateSanction.count({ where: { teammateId: candidate.teammateId, type: "WARNING", reason: { contains: "no-show", mode: "insensitive" } } });
      await prisma.teammateSanction.create({ data: { teammateId: candidate.teammateId, type: "WARNING", reason: `Verified no-show on dispute ${dispute.id}`, internalNote: note, createdById: user.id } });
      if (prior >= 2) {
        await prisma.teammateSanction.create({ data: { teammateId: candidate.teammateId, type: "TEMP_SUSPENSION", reason: "Automatic suspension after 3 verified no-shows", internalNote: note, createdById: user.id, endsAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) } });
        await prisma.teammate.update({ where: { id: candidate.teammateId }, data: { available: false } });
      }
    }
  }
  await prisma.dispute.update({ where: { id }, data: { status: "RESOLVED", resolution, resolutionNote: note, amountEUR: amount || null, resolvedAt: new Date(), assigneeId: dispute.assigneeId ?? user.id } });
  await writeAudit({ actorId: user.id, action: "dispute.resolved", entityType: "Dispute", entityId: id, reason: note, before: { status: dispute.status }, after: { status: "RESOLVED", resolution, amountEUR: amount } });

  // The outcome is the whole point of the ticket, and it is the one message
  // in this flow that carries money: the resolution note is what a customer
  // goes looking for weeks later, so this one is mailed as well as belled
  // (see the policy table in notify/channels.ts).
  const paid = (resolution === "REFUND" || resolution === "PARTIAL_REFUND" || resolution === "CREDIT") && amount > 0
    ? ` · €${amount.toFixed(2)}`
    : "";
  await notifyUser(dispute.openedById, {
    type: "dispute.resolved",
    title: `Ticket resolved · ${resolution.replaceAll("_", " ").toLowerCase()}${paid}`,
    body: note,
    href: ticketHref(dispute.openedByRole),
  });
  revalidatePath("/dashboard/admin/disputes");
  revalidatePath(ticketHref(dispute.openedByRole));
}
