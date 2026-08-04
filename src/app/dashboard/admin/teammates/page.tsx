import type { Metadata } from "next";
import { AdminTeammatesTable, type AdminTeammateRow } from "@/components/dashboard/admin/AdminTeammatesTable";
import { AdminTableToolbar } from "@/components/dashboard/admin/AdminTableToolbar";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Teammates" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Props = { searchParams: Promise<{ q?: string; availability?: string; page?: string }> };

export default async function AdminTeammatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const availability = params.availability === "online" || params.availability === "offline" ? params.availability : undefined;

  const where: Prisma.TeammateWhereInput = {
    ...(availability ? { available: availability === "online" } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { user: { is: { email: { contains: q, mode: "insensitive" as const } } } },
            { user: { is: { discordUsername: { contains: q, mode: "insensitive" as const } } } },
            ...(/^#?\d+$/.test(q) ? [{ teammateNo: Number.parseInt(q.replace("#", ""), 10) }] : []),
          ],
        }
      : {}),
  };

  const [total, rosterSize, availableCount, linkedCount, listedCount] = await Promise.all([
    prisma.teammate.count({ where }),
    prisma.teammate.count(),
    prisma.teammate.count({ where: { available: true } }),
    prisma.teammate.count({ where: { userId: { not: null } } }),
    // gameSlugs is a Json array — "listed for at least one game" is simply
    // "not the empty array", which Postgres can answer without loading rows.
    prisma.teammate.count({ where: { NOT: { gameSlugs: { equals: [] } } } }),
  ]);

  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);
  const teammates = await prisma.teammate.findMany({
    where,
    orderBy: { name: "asc" },
    include: { user: true },
    skip,
    take,
  });

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
    balanceEUR: Number(t.balanceEUR),
  }));

  const hrefFor = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (availability) next.set("availability", availability);
    next.set("page", String(nextPage));
    return `/dashboard/admin/teammates?${next}`;
  };

  return (
    <>
      {/* Availability flips server-side; keep the list in step with it. */}
      <LiveRefresh />
      <StatGrid>
        <StatCard icon="fa-solid fa-headset" label="Teammates" value={rosterSize} color="var(--accent)" />
        <StatCard icon="fa-solid fa-circle-check" label="Available" value={availableCount} color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-link" label="With an account" value={linkedCount} color="var(--hue-cyan)" />
        <StatCard icon="fa-solid fa-gamepad" label="Listed for a game" value={listedCount} color="var(--hue-gold)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Teammates</div>
            <div className="dashboard-panel__sub">
              Edit a teammate&rsquo;s game profile and which games they&rsquo;re listed for &middot; {total} matching
            </div>
          </div>
        </div>

        <AdminTableToolbar
          initialQuery={q}
          placeholder="Search name, email, Discord or roster no…"
          searchLabel="Search teammates"
          filter={{
            param: "availability",
            value: availability ?? "",
            options: [
              { value: "", label: "Any availability", icon: "fa-solid fa-layer-group" },
              { value: "online", label: "Available", icon: "fa-solid fa-circle-check" },
              { value: "offline", label: "Offline", icon: "fa-regular fa-circle" },
            ],
          }}
        />

        {rows.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" />
            <p>No matching teammates.</p>
          </div>
        ) : (
          <AdminTeammatesTable teammates={rows} />
        )}

        <TablePagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} hrefFor={hrefFor} label="Teammates pagination" />
      </div>
    </>
  );
}
