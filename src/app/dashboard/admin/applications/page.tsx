import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { AdminTableToolbar } from "@/components/dashboard/admin/AdminTableToolbar";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";
import { ApplicationsBoard, type ApplicationView } from "@/components/dashboard/admin/ApplicationsBoard";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };

const STATUSES = ["PENDING", "INVITED", "DECLINED"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminApplicationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const status = STATUSES.includes(params.status as Status) ? (params.status as Status) : undefined;

  const where: Prisma.TeammateApplicationWhereInput = {
    AND: [
      ...(status ? [{ status }] : []),
      ...(q
        ? [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { discord: { contains: q, mode: "insensitive" as const } },
                { ranks: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
    ],
  };

  const [total, pending, invited, declined] = await Promise.all([
    prisma.teammateApplication.count({ where }),
    prisma.teammateApplication.count({ where: { status: "PENDING" } }),
    prisma.teammateApplication.count({ where: { status: "INVITED" } }),
    prisma.teammateApplication.count({ where: { status: "DECLINED" } }),
  ]);

  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);

  const rows = await prisma.teammateApplication.findMany({
    where,
    // Pending first regardless of age: this is a work queue, and a decided
    // row is history. Within a status, oldest first — the person who has been
    // waiting longest is the one to answer next.
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    skip,
    take,
  });

  const applications: ApplicationView[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    discord: row.discord,
    country: row.country,
    games: (row.games as string[] | null) ?? [],
    ranks: row.ranks,
    hours: row.hours,
    experience: row.experience,
    status: row.status,
    createdAt: row.createdAt.getTime(),
    reviewedAt: row.reviewedAt?.getTime() ?? null,
  }));

  const hrefFor = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    next.set("page", String(nextPage));
    return `/dashboard/admin/applications?${next}`;
  };

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-inbox" label="Waiting" value={pending} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-paper-plane" label="Invited" value={invited} color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-ban" label="Declined" value={declined} color="var(--text-faint)" />
      </StatGrid>

      <AdminTableToolbar
        initialQuery={q}
        placeholder="Search name, email, Discord or rank…"
        searchLabel="Search applications"
        filters={[
          {
            param: "status",
            value: status ?? "",
            options: [
              { value: "", label: "Any status", icon: "fa-solid fa-layer-group" },
              { value: "PENDING", label: "Waiting", icon: "fa-solid fa-hourglass-half" },
              { value: "INVITED", label: "Invited", icon: "fa-solid fa-paper-plane" },
              { value: "DECLINED", label: "Declined", icon: "fa-solid fa-ban" },
            ],
          },
        ]}
      />

      <ApplicationsBoard applications={applications} />

      <TablePagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        hrefFor={hrefFor}
        label="Applications pagination"
      />
    </>
  );
}
