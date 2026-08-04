import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const INVITE_DEFAULT_DAYS = 7;

export type InviteState = "open" | "used" | "expired" | "revoked";

export interface InviteRow {
  id: string;
  token: string;
  note: string | null;
  email: string | null;
  expiresAt: Date;
  openCount: number;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/** 32 bytes of url-safe randomness — long enough not to be guessable. */
export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function inviteState(invite: Pick<InviteRow, "usedAt" | "revokedAt" | "expiresAt">): InviteState {
  if (invite.revokedAt) return "revoked";
  if (invite.usedAt) return "used";
  if (invite.expiresAt.getTime() <= Date.now()) return "expired";
  return "open";
}

/**
 * Looks an invite up for the public join page and counts the visit.
 *
 * The counter is bookkeeping only — it is never compared against a limit.
 * Link previews (Discord, Slack, iMessage) fetch a URL the moment it is
 * posted, so anything that spent an invite on being *opened* would be gone
 * before the recipient clicked it. What stops a forwarded link from creating
 * a hundred accounts is that redemption marks it used, once.
 */
export async function openInvite(token: string) {
  const invite = await prisma.teammateInvite.findUnique({ where: { token } });
  if (!invite) return null;

  await prisma.teammateInvite
    .update({ where: { id: invite.id }, data: { openCount: { increment: 1 } } })
    .catch(() => undefined);

  return invite;
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/join/${token}`;
}
