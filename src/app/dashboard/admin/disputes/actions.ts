"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { writeAudit } from "@/lib/admin/audit";
import { manualRefund } from "@/app/dashboard/admin/orders/actions";
import { adjustClientCredit } from "@/app/dashboard/admin/accounts/actions";

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
  revalidatePath("/dashboard/admin/disputes");
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
  revalidatePath("/dashboard/admin/disputes");
}
