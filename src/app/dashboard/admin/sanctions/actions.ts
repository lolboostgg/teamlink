"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { writeAudit } from "@/lib/admin/audit";

export async function createSanction(formData: FormData) {
  const { user } = await requireAdmin("operations");
  const teammateId = String(formData.get("teammateId") ?? "");
  const type = String(formData.get("type") ?? "WARNING") as "WARNING" | "TEMP_SUSPENSION" | "BAN";
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const internalNote = String(formData.get("internalNote") ?? "").trim().slice(0, 2000) || null;
  const hours = Math.max(1, Math.min(24 * 365, Number(formData.get("hours") ?? 24)));
  if (!teammateId || !reason) throw new Error("Teammate and reason are required.");
  const endsAt = type === "TEMP_SUSPENSION" ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;
  const sanction = await prisma.$transaction(async (tx) => {
    const created = await tx.teammateSanction.create({ data: { teammateId, type, reason, internalNote, endsAt, createdById: user.id } });
    if (type !== "WARNING") await tx.teammate.update({ where: { id: teammateId }, data: { available: false } });
    return created;
  });
  await writeAudit({ actorId: user.id, action: `sanction.${type.toLowerCase()}`, entityType: "Teammate", entityId: teammateId, reason, after: { sanctionId: sanction.id, type, endsAt } });
  revalidatePath("/dashboard/admin/sanctions"); revalidatePath("/dashboard/admin/teammates");
}

export async function revokeSanction(formData: FormData) {
  const { user } = await requireAdmin("operations");
  const id = String(formData.get("id") ?? "");
  const sanction = await prisma.teammateSanction.findUnique({ where: { id } });
  if (!sanction) throw new Error("Sanction not found.");
  await prisma.teammateSanction.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date(), revokedById: user.id } });
  await writeAudit({ actorId: user.id, action: "sanction.revoked", entityType: "Teammate", entityId: sanction.teammateId, reason: sanction.reason, before: { status: sanction.status }, after: { status: "REVOKED" } });
  revalidatePath("/dashboard/admin/sanctions");
}
