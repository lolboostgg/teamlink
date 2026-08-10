"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSensitiveAdmin } from "@/lib/admin/reauth";
import { writeAudit } from "@/lib/admin/audit";

export async function setAdminRole(formData: FormData) {
  const { user } = await requireSensitiveAdmin(String(formData.get("password") ?? ""), "security");
  const userId = String(formData.get("userId") ?? "");
  const adminRole = String(formData.get("adminRole") ?? "SUPPORT") as "SUPPORT" | "OPERATIONS" | "FINANCE" | "SUPERADMIN";
  if (userId === user.id && adminRole !== "SUPERADMIN") throw new Error("You cannot remove your own superadmin access.");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, adminRole: true } });
  if (!target || target.role !== "ADMIN") throw new Error("Admin not found.");
  await prisma.user.update({ where: { id: userId }, data: { adminRole } });
  await writeAudit({ actorId: user.id, action: "admin.role_changed", entityType: "User", entityId: userId, reason: "Admin permission change", before: { adminRole: target.adminRole ?? "SUPERADMIN" }, after: { adminRole } });
  revalidatePath("/dashboard/admin/staff");
}
