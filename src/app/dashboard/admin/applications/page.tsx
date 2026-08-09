import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { ApplicationsBoard, type ApplicationView } from "@/components/dashboard/admin/ApplicationsBoard";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const [rows, pending, invited, declined] = await Promise.all([
    // Pending first regardless of age: this is a work queue, and a decided
    // row is history. Within a status, oldest first — the person who has
    // been waiting longest is the one to answer next.
    prisma.teammateApplication.findMany({ orderBy: [{ status: "asc" }, { createdAt: "asc" }], take: 200 }),
    prisma.teammateApplication.count({ where: { status: "PENDING" } }),
    prisma.teammateApplication.count({ where: { status: "INVITED" } }),
    prisma.teammateApplication.count({ where: { status: "DECLINED" } }),
  ]);

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

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-inbox" label="Waiting" value={pending} color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-paper-plane" label="Invited" value={invited} color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-ban" label="Declined" value={declined} color="var(--text-faint)" />
      </StatGrid>

      <ApplicationsBoard applications={applications} />
    </>
  );
}
