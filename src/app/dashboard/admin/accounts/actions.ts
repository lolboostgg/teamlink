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
  return session.user.id;
}

/**
 * Moves a customer's store credit by hand.
 *
 * The mirror of adjustTeammateBalance, against the other ledger: a client's
 * money lives in CreditTransaction with User.creditBalanceCents as the
 * denormalised running total, so both move in one transaction or neither
 * does. ADMIN_ADJUST already existed as a type — this is the first thing to
 * write one.
 *
 * A reason is mandatory. It lands in the customer's own transaction history,
 * and a balance that changed with no explanation is a support ticket.
 */
export async function adjustClientCredit(input: {
  userId: string;
  /** Always positive; `direction` carries the sign. */
  amountEUR: number;
  direction: "add" | "deduct";
  reason: string;
}) {
  await requireAdmin();

  const reason = input.reason.trim().slice(0, 300);
  if (!reason) throw new Error("Give a reason — the customer sees it.");

  const cents = Math.round(Math.abs(input.amountEUR) * 100);
  if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter an amount greater than zero.");
  const signed = input.direction === "deduct" ? -cents : cents;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId }, select: { creditBalanceCents: true } });
    if (!user) throw new Error("Unknown account.");

    // A deduction may not push the balance below zero: nothing in checkout can
    // settle a negative store credit, so it would just be a number that quietly
    // eats the customer's next top-up.
    if (signed < 0 && cents > user.creditBalanceCents) {
      throw new Error(`Their balance is only €${(user.creditBalanceCents / 100).toFixed(2)}.`);
    }

    await tx.creditTransaction.create({
      data: { userId: input.userId, type: "ADMIN_ADJUST", amountCents: signed, note: reason },
    });
    await tx.user.update({
      where: { id: input.userId },
      data: { creditBalanceCents: { increment: signed } },
    });
  });

  const amount = (cents / 100).toFixed(2);
  await notifyUser(input.userId, {
    type: input.direction === "deduct" ? "credit.deducted" : "credit.added",
    title: input.direction === "deduct" ? `€${amount} removed from your balance` : `€${amount} added to your balance`,
    body: reason,
    href: "/dashboard/client/wallet",
  });

  await revalidateAccount(input.userId);
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/client/wallet");
}

/**
 * Locks an account out, or lets it back in.
 *
 * The ban is a column on the user rather than a deletion: orders, reviews and
 * the ledger all still point at them, and a support conversation six weeks
 * later needs the account to still exist. Enforced in three places, because
 * one is not enough — `authorize` and `signIn` stop a new sign-in, and the
 * throttled re-read in the jwt callback drops the session the person is using
 * right now (see auth.ts).
 */
export async function setAccountBanned(userId: string, banned: boolean, reason: string) {
  const adminId = await requireAdmin();
  if (userId === adminId) throw new Error("You can't ban your own account.");

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) throw new Error("Unknown account.");
  // Not a hierarchy we can express safely: an admin locking out another admin
  // is how a project ends up with nobody who can unlock anything.
  if (banned && target.role === "ADMIN") throw new Error("Admin accounts can't be banned from here.");

  const note = reason.trim().slice(0, 300);
  if (banned && !note) throw new Error("Give a reason — it's what they're shown when they try to sign in.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: banned ? { bannedAt: new Date(), bannedReason: note } : { bannedAt: null, bannedReason: null },
    });

    // A banned teammate must leave the live roster immediately. Unbanning
    // does not silently mark them online again.
    if (banned) {
      await tx.teammate.updateMany({ where: { userId }, data: { available: false } });
    }
  });

  // Only worth telling them about being let back in — a banned account can't
  // read its notifications, and the reason reaches them at the sign-in form.
  if (!banned) {
    await notifyUser(userId, {
      type: "account.unbanned",
      title: "Your account has been reinstated",
      body: "You can sign in and book again.",
      href: "/dashboard/client",
    });
  }

  await revalidateAccount(userId);
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/teammates");
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
