import type { Metadata } from "next";
import { getAllTeammates } from "@/lib/admin/teammates";
import { AdminTeammatesTable, type AdminTeammateRow } from "@/components/dashboard/admin/AdminTeammatesTable";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";

export const metadata: Metadata = { title: "Teammates" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

export default async function AdminTeammatesPage() {
  const teammates = await getAllTeammates();
  const rows: AdminTeammateRow[] = teammates.map((t) => ({
    id: t.id,
    teammateNo: t.teammateNo,
    accountNo: t.user?.accountNo ?? null,
    name: t.name,
    avatarUrl: t.avatarUrl,
    email: t.user?.email ?? null,
    gameSlugs: (t.gameSlugs as string[] | null) ?? [],
    available: t.available,
    discordId: t.user?.discordId ?? null,
    discordUsername: t.user?.discordUsername ?? null,
    discordAvatar: t.user?.discordAvatar ?? null,
  }));

  const linked = teammates.filter((t) => t.userId).length;

  return (
    <>
    {/* Availability flips server-side; keep the list in step with it. */}
    <LiveRefresh />
    <StatGrid>
      <StatCard icon="fa-solid fa-headset" label="Teammates" value={teammates.length} color="var(--accent)" />
      <StatCard
        icon="fa-solid fa-circle-check"
        label="Available"
        value={teammates.filter((t) => t.available).length}
        color="var(--hue-green)"
      />
      <StatCard icon="fa-solid fa-link" label="With an account" value={linked} color="var(--hue-cyan)" />
      <StatCard
        icon="fa-solid fa-gamepad"
        label="Listed for a game"
        value={teammates.filter((t) => ((t.gameSlugs as string[] | null) ?? []).length > 0).length}
        color="var(--hue-gold)"
      />
    </StatGrid>

    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Teammates</div>
          <div className="dashboard-panel__sub">Edit a teammate&rsquo;s game profile and which games they&rsquo;re listed for</div>
        </div>
      </div>
      <AdminTeammatesTable teammates={rows} />
    </div>
    </>
  );
}
