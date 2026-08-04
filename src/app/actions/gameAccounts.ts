"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { GAMES } from "@/lib/games";
import { getGameProfileConfig } from "@/lib/gameProfiles";
import { regionsForGame } from "@/lib/gameRegions";
import { Prisma } from "@/generated/prisma/client";

export interface GameAccountView {
  id: string;
  gameSlug: string;
  ign: string;
  region: string;
  roles: string[];
  isDefault: boolean;
}

export interface SaveGameAccountInput {
  id?: string;
  gameSlug: string;
  ign: string;
  region: string;
  roles: string[];
}

/**
 * Validated against the registries rather than trusted: these end up in a
 * Json column and on the teammate's screen, so an arbitrary string would sit
 * there forever.
 */
function clean(input: SaveGameAccountInput) {
  const game = GAMES.find((entry) => entry.slug === input.gameSlug);
  if (!game) throw new Error("Unknown game.");

  const ign = input.ign.trim().slice(0, 60);
  if (!ign) throw new Error("Enter your in-game name.");

  const regions = regionsForGame(input.gameSlug);
  const region = regions.find((entry) => entry.value === input.region)?.value;
  if (!region) throw new Error("Pick your server or region.");

  const allowed = new Set((getGameProfileConfig(input.gameSlug)?.roles?.options ?? []).map((option) => option.value));
  const roles = [...new Set(input.roles.filter((role) => allowed.has(role)))];

  return { gameSlug: game.slug, ign, region, roles };
}

export async function listGameAccounts(gameSlug?: string): Promise<GameAccountView[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await prisma.gameAccount.findMany({
    where: { userId: session.user.id, ...(gameSlug ? { gameSlug } : {}) },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    gameSlug: row.gameSlug,
    ign: row.ign,
    region: row.region,
    roles: Array.isArray(row.roles) ? (row.roles as string[]) : [],
    isDefault: row.isDefault,
  }));
}

export async function saveGameAccount(input: SaveGameAccountInput): Promise<GameAccountView> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in to save an account.");

  const data = clean(input);
  const userId = session.user.id;

  const existingCount = await prisma.gameAccount.count({ where: { userId, gameSlug: data.gameSlug } });

  const row = input.id
    ? await prisma.gameAccount.update({
        // Scoped by userId so an id from another account can't be steered here.
        where: { id: input.id, userId },
        data: { ign: data.ign, region: data.region, roles: data.roles as Prisma.InputJsonValue },
      })
    : await prisma.gameAccount.create({
        data: {
          userId,
          gameSlug: data.gameSlug,
          ign: data.ign,
          region: data.region,
          roles: data.roles as Prisma.InputJsonValue,
          // First account for a game becomes the one checkout pre-selects.
          isDefault: existingCount === 0,
        },
      });

  revalidatePath("/dashboard/client/settings");

  return {
    id: row.id,
    gameSlug: row.gameSlug,
    ign: row.ign,
    region: row.region,
    roles: Array.isArray(row.roles) ? (row.roles as string[]) : [],
    isDefault: row.isDefault,
  };
}

export async function deleteGameAccount(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  await prisma.gameAccount.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/dashboard/client/settings");
}
