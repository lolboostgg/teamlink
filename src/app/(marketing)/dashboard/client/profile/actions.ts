"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function updateProfile(input: { name: string; avatarUrl: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, avatarUrl: input.avatarUrl.trim() || null },
  });

  revalidatePath("/dashboard/client/profile");
  revalidatePath("/dashboard/admin/profile");
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  if (input.newPassword.length < 8) throw new Error("New password must be at least 8 characters.");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    throw new Error("This account signed up via Discord/Google and has no password to change.");
  }

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } });
}
