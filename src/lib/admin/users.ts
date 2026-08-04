import { prisma } from "@/lib/db";

/**
 * The newest accounts, for the overview's preview table. Separate from
 * getUsersWithTeammate() because that one is the full roster — the overview
 * only ever renders a handful and shouldn't pay for the rest.
 */
export async function getRecentUsers(limit: number) {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { teammate: true },
    take: limit,
  });
}
