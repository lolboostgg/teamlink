"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin as requireScopedAdmin } from "@/lib/admin/access";
import { writeAudit } from "@/lib/admin/audit";

async function requireAdmin() {
  await requireScopedAdmin("security");
}

type AssignableRole = "ADMIN" | "TEAMMATE" | "CLIENT";

export async function setUserRole(userId: string, role: AssignableRole) {
  const admin = await requireScopedAdmin("security");
  if (admin.user.id === userId && role !== "ADMIN") throw new Error("You cannot remove your own admin role.");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { teammate: true } });
  if (!user) throw new Error("User not found.");

  if (role === "TEAMMATE") {
    const name = user.teammate?.name || user.name || user.email.split("@")[0];
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { role } }),
      prisma.teammate.upsert({
        where: { userId },
        create: { id: crypto.randomUUID(), userId, name, avatarInitials: initialsFrom(name), gameSlugs: [], languages: ["en"], available: true },
        update: { available: true },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { role } }),
      prisma.teammate.updateMany({ where: { userId }, data: { available: false } }),
    ]);
  }
  await writeAudit({ actorId: admin.user.id, action: "user.role_changed", entityType: "User", entityId: userId, reason: "Account role change", before: { role: user.role }, after: { role } });
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return initials || "TM";
}

// Promoting keeps any existing Teammate row alive (a re-promote after a
// demotion just flips it back to available) rather than creating a
// duplicate — past orders/reviews reference the Teammate row by id, so it
// can never just be deleted on demotion either.
export async function promoteToTeammate(userId: string, displayName: string) {
  await requireAdmin();
  const name = displayName.trim();
  if (!name) throw new Error("A display name is required.");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: "TEAMMATE" } }),
    prisma.teammate.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        name,
        avatarInitials: initialsFrom(name),
        gameSlugs: [],
        languages: ["en"],
        available: true,
      },
      update: { name, available: true },
    }),
  ]);

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
}

export async function demoteToClient(userId: string) {
  await requireAdmin();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: "CLIENT" } }),
    prisma.teammate.updateMany({ where: { userId }, data: { available: false } }),
  ]);

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
}
