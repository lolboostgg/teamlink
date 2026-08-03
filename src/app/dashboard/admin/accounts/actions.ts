"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden — admin only.");
  }
}

// Same cost factor as registration (api/auth/register) so a reset password
// verifies identically to a self-chosen one.
export async function setUserPassword(userId: string, password: string) {
  await requireAdmin();
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  revalidatePath(`/dashboard/admin/accounts/${userId}`);
}

export async function reviewVerification(teammateId: string, approve: boolean, note: string) {
  await requireAdmin();
  if (!approve && !note.trim()) throw new Error("A rejection needs a reason — the teammate sees it.");

  await prisma.teammateVerification.update({
    where: { teammateId },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      reviewNote: approve ? null : note.trim().slice(0, 500),
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/admin/users");
}

export async function updateAccountDetails(userId: string, input: { name: string; email: string }) {
  await requireAdmin();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email) throw new Error("Email is required.");

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash && clash.id !== userId) throw new Error("That email is already taken.");

  await prisma.user.update({ where: { id: userId }, data: { name: name || null, email } });

  revalidatePath(`/dashboard/admin/accounts/${userId}`);
  revalidatePath("/dashboard/admin/users");
}
