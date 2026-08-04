"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { inviteState } from "@/lib/teammateInvites";
import { notifyAdmins } from "@/lib/notifications/service";

export interface JoinResult {
  ok: boolean;
  error?: string;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "TM";
}

/**
 * Redeems an invite: creates the account and its teammate row, then marks the
 * invite used. The new teammate lands on the onboarding checklist — nothing
 * here fills in a profile, so `available` starts false and they cannot be
 * dispatched until they have actually finished setting themselves up.
 */
export async function redeemInvite(token: string, input: { name: string; email: string; password: string }): Promise<JoinResult> {
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 160);
  const password = input.password;

  if (!name) return { ok: false, error: "Enter your display name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8) return { ok: false, error: "Passwords need at least 8 characters." };

  const invite = await prisma.teammateInvite.findUnique({ where: { token } });
  if (!invite || inviteState(invite) !== "open") {
    return { ok: false, error: "This invite link is no longer valid." };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "An account with that email already exists — sign in instead." };

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      // Re-checked inside the transaction: two people submitting the same
      // forwarded link at once would both pass the check above.
      const fresh = await tx.teammateInvite.findUnique({ where: { id: invite.id } });
      if (!fresh || inviteState(fresh) !== "open") throw new Error("INVITE_TAKEN");

      const user = await tx.user.create({
        data: { email, name, passwordHash, role: "TEAMMATE" },
      });

      await tx.teammate.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          name,
          avatarInitials: initialsFrom(name),
          gameSlugs: [],
          languages: [],
          // Stays offline until onboarding is done — an empty profile must
          // never enter the dispatch pool.
          available: false,
        },
      });

      // The unique index on usedByUserId is the real guard; this update is
      // what trips it if a second transaction got this far.
      await tx.teammateInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedByUserId: user.id },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INVITE_TAKEN") {
      return { ok: false, error: "This invite link has already been used." };
    }
    return { ok: false, error: "Couldn't create your account — try again." };
  }

  await notifyAdmins({
    type: "teammate.joined",
    title: `${name} joined via an invite link`,
    body: invite.note ? `Invite note: ${invite.note}` : "Onboarding checklist is now theirs to complete.",
    href: "/dashboard/admin/onboarding",
  });

  return { ok: true };
}
