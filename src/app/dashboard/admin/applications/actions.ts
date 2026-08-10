"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { newInviteToken, inviteUrl, INVITE_DEFAULT_DAYS } from "@/lib/teammateInvites";
import { sendMail } from "@/lib/notify/mail";
import { teammateInviteMail } from "@/lib/notify/templates";
import { appUrl } from "@/lib/notify/orderNotifications";

/**
 * Working through the application queue.
 *
 * Accepting does not create a teammate — it creates an invite and mails the
 * link. Redeeming that link is still the only path to an account (see
 * app/join/[token]), so an accepted application that nobody acts on costs
 * nothing and expires on its own.
 */

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Admins only.");
  return session.user.id!;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** The invite link, so the admin can copy it without waiting for the mail. */
  inviteUrl?: string;
}

function refresh() {
  revalidatePath("/dashboard/admin/applications");
  revalidatePath("/dashboard/admin/onboarding");
}

export async function acceptApplication(id: string, days = INVITE_DEFAULT_DAYS): Promise<ActionResult> {
  const adminId = await requireAdmin();

  const application = await prisma.teammateApplication.findUnique({ where: { id } });
  if (!application) return { ok: false, error: "That application is gone." };
  if (application.status === "INVITED") return { ok: false, error: "This one has already been invited." };

  // Re-checked here and not only at submission time: an application can sit
  // in the queue for days, and the applicant may have been given an account
  // by hand in the meantime.
  const account = await prisma.user.findUnique({ where: { email: application.email }, select: { role: true } });
  if (account?.role === "TEAMMATE" || account?.role === "ADMIN") {
    return { ok: false, error: "That address already has a teammate account." };
  }

  const validDays = Math.min(90, Math.max(1, Math.round(days) || INVITE_DEFAULT_DAYS));
  const token = newInviteToken();

  const invite = await prisma.teammateInvite.create({
    data: {
      token,
      note: `Application — ${application.name}`,
      email: application.email,
      createdById: adminId,
      expiresAt: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.teammateApplication.update({
    where: { id },
    data: { status: "INVITED", inviteId: invite.id, reviewedAt: new Date(), reviewedById: adminId },
  });

  const url = inviteUrl(appUrl(), token);

  // Best-effort, like every other send: the invite exists either way, and the
  // link comes back to the caller so it can be copied out by hand.
  await sendMail({
    to: application.email,
    ...teammateInviteMail({ name: application.name, url, days: validDays }),
  });

  refresh();
  return { ok: true, inviteUrl: url };
}

export async function declineApplication(id: string): Promise<ActionResult> {
  const adminId = await requireAdmin();
  // Kept, not deleted: the row is what stops the same address applying again
  // next week. Deleting is the separate, deliberate "you may try again".
  await prisma.teammateApplication.updateMany({
    where: { id },
    data: { status: "DECLINED", reviewedAt: new Date(), reviewedById: adminId },
  });
  refresh();
  return { ok: true };
}

/** Puts a decided application back in the queue. */
export async function reopenApplication(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.teammateApplication.updateMany({
    where: { id, status: { not: "INVITED" } },
    data: { status: "PENDING", reviewedAt: null, reviewedById: null },
  });
  refresh();
  return { ok: true };
}

/**
 * Removes the row entirely, which also clears the block on that email — the
 * one way to let somebody apply again from scratch.
 */
export async function deleteApplication(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.teammateApplication.delete({ where: { id } }).catch(() => null);
  refresh();
  return { ok: true };
}
