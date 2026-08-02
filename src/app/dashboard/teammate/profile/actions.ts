"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sanitizeTeammateProfileInput, type TeammateProfileInput } from "@/lib/teammateProfile";

// Teammates edit their own game profile — not the admin-only gameSlugs
// (which games they're listed for) or name, which stays admin territory
// per the request ("der admin kann dann die games festlegen für die
// teammates").
export async function updateOwnProfile(input: TeammateProfileInput) {
  const session = await auth();
  if (session?.user?.role !== "TEAMMATE") {
    throw new Error("Forbidden — teammates only.");
  }

  const clean = sanitizeTeammateProfileInput(input);

  const { count } = await prisma.teammate.updateMany({
    where: { userId: session.user.id },
    data: {
      tagline: clean.tagline || null,
      timezone: clean.timezone || null,
      avatarUrl: clean.avatarUrl || null,
      languages: clean.languages,
      lolRank: clean.lolRank,
      lolChampions: clean.lolChampions,
      lolLanes: clean.lolLanes,
    },
  });
  if (count === 0) throw new Error("No teammate profile linked to this account.");

  revalidatePath("/dashboard/teammate/profile");
}
