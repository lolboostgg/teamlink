"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden — admin only.");
  }
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
