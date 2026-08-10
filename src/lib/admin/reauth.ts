import "server-only";

import bcrypt from "bcryptjs";
import { requireAdmin, type AdminPermission } from "@/lib/admin/access";
import { enforceRateLimit } from "@/lib/admin/rateLimit";

export async function requireSensitiveAdmin(password: string, permission: AdminPermission) {
  const admin = await requireAdmin(permission);
  await enforceRateLimit(`reauth:${admin.user.id}`, 8, 15 * 60_000);
  if (!admin.user.passwordHash || !(await bcrypt.compare(password, admin.user.passwordHash))) throw new Error("Current password is incorrect.");
  return admin;
}
