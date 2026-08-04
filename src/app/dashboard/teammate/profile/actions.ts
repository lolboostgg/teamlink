"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { sanitizeTeammateProfileInput, type TeammateProfileClientInput } from "@/lib/teammateProfile";

// Teammates edit their own game profile, including which games they're
// listed for — onboarding asks them to choose those themselves. The display
// name stays admin territory.
export async function updateOwnProfile(input: TeammateProfileClientInput) {
  const session = await auth();
  if (session?.user?.role !== "TEAMMATE") {
    throw new Error("Forbidden — teammates only.");
  }

  const clean = sanitizeTeammateProfileInput(input);

  // Teammates don't get a separate "account" avatar upload (only this
  // game-profile one), so mirror it onto User.avatarUrl too — that's the
  // field the header avatar (auth.ts's session.user.image) actually reads,
  // same as a client's own profile picture.
  const [{ count }] = await prisma.$transaction([
    prisma.teammate.updateMany({
      where: { userId: session.user.id },
      data: {
        tagline: clean.tagline || null,
        timezone: clean.timezone || null,
        avatarUrl: clean.avatarUrl || null,
        languages: clean.languages,
        gameSlugs: clean.gameSlugs,
        // See the note in the admin action — Prisma's Json input type needs
        // the assertion for a Record of interfaces.
        gameProfiles: clean.gameProfiles as unknown as Prisma.InputJsonObject,
        lolRank: clean.lolRank,
        lolChampions: clean.lolChampions,
        lolLanes: clean.lolLanes,
      },
    }),
    prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: clean.avatarUrl || null } }),
  ]);
  if (count === 0) throw new Error("No teammate profile linked to this account.");

  revalidatePath("/dashboard/teammate/profile");
  revalidatePath("/dashboard/teammate/onboarding");
}
