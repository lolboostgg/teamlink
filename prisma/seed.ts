import "dotenv/config";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TEAMMATES } from "@/lib/teammates";

// One-off seed of the static roster (src/lib/teammates.ts) into the real
// Teammate table — run manually with `npx tsx prisma/seed.ts` for now.
async function main() {
  for (const t of TEAMMATES) {
    await prisma.teammate.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        name: t.name,
        avatarInitials: t.avatarInitials,
        tagline: t.tagline,
        timezone: t.timezone,
        rating: t.rating,
        sessionsCount: t.sessions,
        gameSlugs: t.gameSlugs,
        languages: t.languages,
        lolRank: t.lolRank ?? null,
        lolChampions: t.lolChampions ?? Prisma.JsonNull,
      },
      update: {
        name: t.name,
        avatarInitials: t.avatarInitials,
        tagline: t.tagline,
        timezone: t.timezone,
        rating: t.rating,
        sessionsCount: t.sessions,
        gameSlugs: t.gameSlugs,
        languages: t.languages,
        lolRank: t.lolRank ?? null,
        lolChampions: t.lolChampions ?? Prisma.JsonNull,
      },
    });
    console.log(`seeded ${t.id}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
