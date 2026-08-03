"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Detaches Discord from the signed-in account. Clears the display cache with
 * it, so a stale username can never be shown for an account that is no longer
 * linked.
 */
export async function unlinkDiscord() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You need to be signed in.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { discordId: null, discordUsername: null, discordAvatar: null, discordLinkedAt: null },
  });

  revalidatePath("/dashboard/client/settings");
  revalidatePath("/dashboard/teammate/connections");
}
