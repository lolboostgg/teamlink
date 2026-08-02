import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { TeammateProfileEditor } from "@/components/dashboard/teammate/TeammateProfileEditor";
import type { LanguageCode } from "@/lib/i18n";
import type { LolRankTier, ChampionName, LolLane } from "@/lib/lolAssets";

export const metadata: Metadata = { title: "My Game Profile" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other admin/teammate pages, see lib/db.ts.
export const dynamic = "force-dynamic";

export default async function TeammateProfilePage() {
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({ where: { userId: session.user.id } })
    : null;

  if (!teammate) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">My Game Profile</div>
            <div className="dashboard-panel__sub">No teammate profile is linked to this account yet.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">My Game Profile</div>
          <div className="dashboard-panel__sub">
            Keep your rank, champion pool, languages and timezone up to date — clients see this when picking a
            teammate. Which games you&rsquo;re listed for is set by an admin.
          </div>
        </div>
      </div>
      <TeammateProfileEditor
        initial={{
          name: teammate.name,
          tagline: teammate.tagline ?? "",
          timezone: teammate.timezone ?? "",
          avatarUrl: teammate.avatarUrl ?? "",
          languages: (teammate.languages as LanguageCode[] | null) ?? [],
          gameSlugs: (teammate.gameSlugs as string[] | null) ?? [],
          lolRank: (teammate.lolRank as LolRankTier | null) ?? null,
          lolChampions: (teammate.lolChampions as ChampionName[] | null) ?? [],
          lolLanes: (teammate.lolLanes as LolLane[] | null) ?? [],
        }}
      />
    </div>
  );
}
