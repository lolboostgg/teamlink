"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { writeAudit } from "@/lib/admin/audit";

export async function revokeAdminSession(formData: FormData) {
  const { user } = await requireAdmin("security");
  const id = String(formData.get("id") ?? "");
  const target = await prisma.adminSession.findUnique({ where: { id } });
  if (!target) throw new Error("Session not found.");
  await prisma.adminSession.update({ where: { id }, data: { revokedAt: new Date() } });
  await writeAudit({ actorId: user.id, action: "admin.session_revoked", entityType: "AdminSession", entityId: id, reason: "Manual device sign-out", before: { revokedAt: target.revokedAt }, after: { revokedAt: new Date() } });
  revalidatePath("/dashboard/admin/security");
}
