import type { Metadata } from "next";
import { AdminUsersTable, type AdminUserRow } from "@/components/dashboard/admin/AdminUsersTable";
import { AdminTableToolbar } from "@/components/dashboard/admin/AdminTableToolbar";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import { prisma } from "@/lib/db";
import { Prisma, Role } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Users" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Props = { searchParams: Promise<{ q?: string; role?: string; page?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const role = Object.values(Role).includes(params.role as Role) ? (params.role as Role) : undefined;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { discordUsername: { contains: q, mode: "insensitive" as const } },
            { teammate: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            ...(/^#?\d+$/.test(q) ? [{ accountNo: Number.parseInt(q.replace("#", ""), 10) }] : []),
          ],
        }
      : {}),
  };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Counts come from the database, not from the page of rows below — with
  // pagination the two would otherwise disagree the moment you turn a page.
  const [total, byRole, newThisMonth] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { teammate: true },
    skip,
    take,
  });

  const countFor = (value: Role) => byRole.find((row) => row.role === value)?._count._all ?? 0;
  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    accountNo: u.accountNo,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    role: u.role,
    createdAt: u.createdAt.getTime(),
    teammateName: u.teammate?.name ?? null,
    discordId: u.discordId,
    discordUsername: u.discordUsername,
    discordAvatar: u.discordAvatar,
    storeCreditCents: u.creditBalanceCents,
    teammateBalanceEUR: u.teammate ? Number(u.teammate.balanceEUR) : 0,
    lastSeenAt: u.lastSeenAt?.getTime() ?? null,
    // Null for an account with no roster profile — that is what tells the
    // table to answer "are they here" instead of "will the dispatcher send
    // them work", which are different questions with different words.
    teammateAvailable: u.teammate ? u.teammate.available : null,
    bannedAt: u.bannedAt?.getTime() ?? null,
  }));

  const hrefFor = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (role) next.set("role", role);
    next.set("page", String(nextPage));
    return `/dashboard/admin/users?${next}`;
  };

  return (
    <>
      <LiveRefresh />
      <StatGrid>
        <StatCard icon="fa-solid fa-users" label="Total accounts" value={countFor(Role.CLIENT) + countFor(Role.TEAMMATE) + countFor(Role.ADMIN)} color="var(--accent)" />
        <StatCard icon="fa-solid fa-user" label="Clients" value={countFor(Role.CLIENT)} color="var(--hue-cyan)" />
        <StatCard icon="fa-solid fa-headset" label="Teammates" value={countFor(Role.TEAMMATE)} color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-user-plus" label="New this month" value={newThisMonth} color="var(--hue-gold)" />
      </StatGrid>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Users</div>
            <div className="dashboard-panel__sub">
              Every real account &mdash; promote a client to teammate, or the other way around &middot; {total} matching
            </div>
          </div>
        </div>

        <AdminTableToolbar
          initialQuery={q}
          placeholder="Search name, email, Discord or account no…"
          searchLabel="Search users"
          filters={[{
            param: "role",
            value: role ?? "",
            options: [
              { value: "", label: "All roles", icon: "fa-solid fa-layer-group" },
              { value: Role.CLIENT, label: "Clients", icon: "fa-solid fa-user" },
              { value: Role.TEAMMATE, label: "Teammates", icon: "fa-solid fa-headset" },
              { value: Role.ADMIN, label: "Admins", icon: "fa-solid fa-user-shield" },
            ],
          }]}
        />

        {rows.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" />
            <p>No matching accounts.</p>
          </div>
        ) : (
          <AdminUsersTable users={rows} />
        )}

        <TablePagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} hrefFor={hrefFor} label="Users pagination" />
      </div>
    </>
  );
}
