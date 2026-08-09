import { prisma } from "@/lib/db";
import { PRESENCE_MAX_AGE_MS } from "@/lib/dispatch/presence";

/**
 * How many teammates could take an order in each game right now.
 *
 * Deliberately the same test the dispatcher applies when it builds a pool
 * (see waves.ts): listed for the game, switch on, and seen recently enough to
 * answer. A browse page promising "9 online" for people the dispatcher would
 * not even invite is worse than promising nothing.
 *
 * gameSlugs is a JSON array, so "listed for this game" cannot go into the
 * query — the roster is small and the filter happens here, exactly as the
 * pool builder does it.
 */
export async function onlineTeammatesByGame(): Promise<Record<string, number>> {
  const cutoff = new Date(Date.now() - PRESENCE_MAX_AGE_MS);
  const online = await prisma.teammate.findMany({
    where: { available: true, lastSeenAt: { gte: cutoff } },
    select: { gameSlugs: true },
  });

  const counts: Record<string, number> = {};
  for (const teammate of online) {
    const slugs = Array.isArray(teammate.gameSlugs) ? teammate.gameSlugs : [];
    for (const slug of slugs) {
      if (typeof slug === "string") counts[slug] = (counts[slug] ?? 0) + 1;
    }
  }
  return counts;
}
