"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications/service";
import { Prisma } from "@/generated/prisma/client";

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

  await revalidateAccount(userId);
}

/**
 * Revalidates the account page as it is actually served — by account number.
 *
 * The cuid still resolves as a fallback, but nobody's browser is sitting on
 * that URL, so revalidating it refreshes a path no one is looking at.
 */
async function revalidateAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountNo: true } });
  if (user) revalidatePath(`/dashboard/admin/accounts/${user.accountNo}`);
}

export async function removeUserTwoFactor(userId: string) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
  if (!user) throw new Error("User not found.");
  const prefs = user.notificationPrefs && typeof user.notificationPrefs === "object" ? user.notificationPrefs as Record<string, unknown> : {};
  const security = prefs._security && typeof prefs._security === "object" ? prefs._security as Record<string, unknown> : {};
  const { twoFactorEnabled: _enabled, twoFactorSecret: _secret, ...remainingSecurity } = security;
  const next = { ...prefs, _security: remainingSecurity };
  await prisma.user.update({ where: { id: userId }, data: { notificationPrefs: next as Prisma.InputJsonObject } });
  await revalidateAccount(userId);
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

  const teammate = await prisma.teammate.findUnique({ where: { id: teammateId }, select: { userId: true } });
  if (teammate?.userId) {
    await notifyUser(teammate.userId, {
      type: approve ? "verification.approved" : "verification.rejected",
      title: approve ? "Your identity was verified" : "Your verification needs another look",
      body: approve ? "Payouts are unlocked." : note.trim(),
      href: "/dashboard/teammate/verification",
    });
  }

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

  await revalidateAccount(userId);
  revalidatePath("/dashboard/admin/users");
}
