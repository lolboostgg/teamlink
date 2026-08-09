"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { sanitizeNotificationPrefs } from "@/lib/notificationPrefs";
import { createTwoFactorSecret, encryptTwoFactorSecret, readTwoFactor, verifyTwoFactorCode } from "@/lib/twoFactor";

export async function saveNotificationPrefs(raw: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You need to be signed in.");

  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notificationPrefs: true } });
  const prefs = { ...sanitizeNotificationPrefs(raw), ...((current?.notificationPrefs as Record<string, unknown> | null)?._security ? { _security: (current!.notificationPrefs as Record<string, unknown>)._security } : {}) };
  await prisma.user.update({
    where: { id: session.user.id },
    // Same assertion as the other Json columns — Prisma's input type doesn't
    // take a Record of nested objects without it.
    data: { notificationPrefs: prefs as unknown as Prisma.InputJsonObject },
  });

  revalidatePath("/dashboard/client/settings");
}

export async function beginTwoFactorSetup() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("You need to be signed in.");
  const secret = createTwoFactorSecret();
  // Label and issuer are what the authenticator app lists the entry under.
  // Only new enrolments are affected — the secret is what verifies a code, so
  // anyone already set up keeps working under the old name until they re-add.
  return { secret, uri: `otpauth://totp/QUP.gg:${encodeURIComponent(session.user.email)}?secret=${secret}&issuer=QUP.gg&digits=6&period=30` };
}

export async function enableTwoFactor(input: { secret: string; code: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You need to be signed in.");
  if (!verifyTwoFactorCode(input.secret, input.code)) throw new Error("That authenticator code is not valid.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notificationPrefs: true } });
  const current = user?.notificationPrefs && typeof user.notificationPrefs === "object" ? user.notificationPrefs as Record<string, unknown> : {};
  const next = { ...current, _security: { twoFactorEnabled: true, twoFactorSecret: encryptTwoFactorSecret(input.secret) } };
  await prisma.user.update({ where: { id: session.user.id }, data: { notificationPrefs: next as Prisma.InputJsonObject } });
  revalidatePath("/dashboard/client/settings");
}

export async function disableTwoFactor(code: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You need to be signed in.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notificationPrefs: true } });
  const record = readTwoFactor(user?.notificationPrefs);
  const secret = record ? (await import("@/lib/twoFactor")).decryptTwoFactorSecret(record.secret) : null;
  if (!secret || !verifyTwoFactorCode(secret, code)) throw new Error("That authenticator code is not valid.");
  const current = user?.notificationPrefs as Record<string, unknown>;
  const { _security: _removed, ...next } = current;
  await prisma.user.update({ where: { id: session.user.id }, data: { notificationPrefs: next as Prisma.InputJsonObject } });
  revalidatePath("/dashboard/client/settings");
}
