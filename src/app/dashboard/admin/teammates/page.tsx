import type { Metadata } from "next";
import { getAllTeammates } from "@/lib/admin/teammates";
import { AdminTeammatesTable, type AdminTeammateRow } from "@/components/dashboard/admin/AdminTeammatesTable";
import { readGameProfiles } from "@/lib/teammateProfile";

export const metadata: Metadata = { title: "Teammates" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default async function AdminTeammatesPage() {
  const teammates = await getAllTeammates();
  const rows: AdminTeammateRow[] = teammates.map((t) => ({
    id: t.id,
    userId: t.userId,
    name: t.name,
    email: t.user?.email ?? null,
    tagline: t.tagline ?? "",
    timezone: t.timezone ?? "",
    avatarUrl: t.avatarUrl,
    languages: (t.languages as string[] | null) ?? [],
    gameSlugs: (t.gameSlugs as string[] | null) ?? [],
    gameProfiles: readGameProfiles(t),
    available: t.available,
  }));

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Teammates</div>
          <div className="dashboard-panel__sub">Edit a teammate&rsquo;s game profile and which games they&rsquo;re listed for</div>
        </div>
      </div>
      <AdminTeammatesTable teammates={rows} />
    </div>
  );
}
