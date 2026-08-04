"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { newInviteToken, INVITE_DEFAULT_DAYS } from "@/lib/teammateInvites";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Admins only.");
  return session.user.id;
}

export async function createInvite(input: { note: string; email: string; days: number }) {
  const adminId = await requireAdmin();
  const days = Math.min(90, Math.max(1, Math.round(input.days) || INVITE_DEFAULT_DAYS));

  await prisma.teammateInvite.create({
    data: {
      token: newInviteToken(),
      note: input.note.trim().slice(0, 120) || null,
      email: input.email.trim().toLowerCase().slice(0, 160) || null,
      createdById: adminId,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/dashboard/admin/onboarding");
}

/**
 * Withdraws an unused invite. Used ones are left alone — the timestamp is the
 * record of when that account was created, and blanking it would lose that.
 */
export async function revokeInvite(inviteId: string) {
  await requireAdmin();
  await prisma.teammateInvite.updateMany({
    where: { id: inviteId, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/dashboard/admin/onboarding");
}

export async function deleteInvite(inviteId: string) {
  await requireAdmin();
  await prisma.teammateInvite.deleteMany({ where: { id: inviteId, usedAt: null } });
  revalidatePath("/dashboard/admin/onboarding");
}
