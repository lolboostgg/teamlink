"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { writeAudit } from "@/lib/admin/audit";

export async function setAdminRole(formData: FormData) {
  const { user } = await requireAdmin("security");
  const userId = String(formData.get("userId") ?? "");
  const requestedRole = String(formData.get("adminRole") ?? "");
  const allowedRoles = ["SUPPORT", "OPERATIONS", "FINANCE", "SUPERADMIN"] as const;
  if (!allowedRoles.includes(requestedRole as (typeof allowedRoles)[number])) throw new Error("Invalid admin role.");
  const adminRole = requestedRole as (typeof allowedRoles)[number];
  if (userId === user.id) throw new Error("You cannot change your own admin role.");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, adminRole: true } });
  if (!target || target.role !== "ADMIN") throw new Error("Admin not found.");
  await prisma.user.update({ where: { id: userId }, data: { adminRole } });
  await writeAudit({ actorId: user.id, action: "admin.role_changed", entityType: "User", entityId: userId, reason: "Admin permission change", before: { adminRole: target.adminRole ?? "SUPERADMIN" }, after: { adminRole } });
  revalidatePath("/dashboard/admin/staff");
}
