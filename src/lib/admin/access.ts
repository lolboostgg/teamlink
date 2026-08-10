import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { AdminRole } from "@/generated/prisma/client";

export type AdminPermission = "support" | "operations" | "finance" | "security";

const GRANTS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPPORT: new Set(["support"]),
  OPERATIONS: new Set(["support", "operations"]),
  FINANCE: new Set(["support", "finance"]),
  SUPERADMIN: new Set(["support", "operations", "finance", "security"]),
};

export async function requireAdmin(permission?: AdminPermission) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, adminRole: true, passwordHash: true, notificationPrefs: true },
  });
  if (!user) throw new Error("Unauthorized");
  // Existing admins predate scoped roles. They remain superadmins until an
  // explicit role is assigned, preventing a migration from locking out staff.
  const role: AdminRole = user.adminRole ?? "SUPERADMIN";
  if (permission && !GRANTS[role].has(permission)) throw new Error("Forbidden");
  return { session, user, role };
}

export function can(role: AdminRole, permission: AdminPermission) {
  return GRANTS[role].has(permission);
}
