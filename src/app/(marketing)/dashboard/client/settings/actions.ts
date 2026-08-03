"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { sanitizeNotificationPrefs } from "@/lib/notificationPrefs";

export async function saveNotificationPrefs(raw: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You need to be signed in.");

  const prefs = sanitizeNotificationPrefs(raw);
  await prisma.user.update({
    where: { id: session.user.id },
    // Same assertion as the other Json columns — Prisma's input type doesn't
    // take a Record of nested objects without it.
    data: { notificationPrefs: prefs as unknown as Prisma.InputJsonObject },
  });

  revalidatePath("/dashboard/client/settings");
}
