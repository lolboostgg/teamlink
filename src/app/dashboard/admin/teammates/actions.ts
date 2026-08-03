"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sanitizeTeammateProfileInput, type TeammateProfileClientInput } from "@/lib/teammateProfile";
import { GAMES } from "@/lib/games";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden — admin only.");
  }
}

const KNOWN_GAME_SLUGS = new Set(GAMES.map((g) => g.slug));

export async function updateTeammateProfile(
  teammateId: string,
  input: Partial<TeammateProfileClientInput> & { gameSlugs: string[]; name: string },
) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  const clean = sanitizeTeammateProfileInput(input);
  const gameSlugs = input.gameSlugs.filter((slug) => KNOWN_GAME_SLUGS.has(slug));

  await prisma.teammate.update({
    where: { id: teammateId },
    data: {
      name,
      tagline: clean.tagline || null,
      timezone: clean.timezone || null,
      avatarUrl: clean.avatarUrl || null,
      languages: clean.languages,
      gameSlugs,
      gameProfiles: clean.gameProfiles,
      lolRank: clean.lolRank,
      lolChampions: clean.lolChampions,
      lolLanes: clean.lolLanes,
    },
  });

  revalidatePath("/dashboard/admin/teammates");
}
