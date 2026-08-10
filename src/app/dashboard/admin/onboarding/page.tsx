import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { inviteState } from "@/lib/teammateInvites";
import { OnboardingInvites, type InviteView } from "@/components/dashboard/admin/OnboardingInvites";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { AdminTableToolbar } from "@/components/dashboard/admin/AdminTableToolbar";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

/**
 * The origin the invite links are built from. Taken from the request rather
 * than hardcoded so a link copied on a staging host doesn't point at
 * production — AUTH_URL wins when it's set, since that's the canonical one.
 */
async function requestOrigin(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

const PAGE_SIZE = 50;

export default async function AdminOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";

  // An invite is looked up by who it was for, which is either the note
  // somebody typed or the address it was pre-filled with.
  const where: Prisma.TeammateInviteWhereInput = q
    ? {
        OR: [
          { note: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { usedByUser: { is: { email: { contains: q, mode: "insensitive" } } } },
          { usedByUser: { is: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};

  const total = await prisma.teammateInvite.count({ where });
  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);

  const [rows, origin] = await Promise.all([
    prisma.teammateInvite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { usedByUser: { select: { name: true, email: true } } },
    }),
    requestOrigin(),
  ]);

  const invites: InviteView[] = rows.map((invite) => ({
    id: invite.id,
    token: invite.token,
    note: invite.note,
    email: invite.email,
    state: inviteState(invite),
    openCount: invite.openCount,
    expiresAt: invite.expiresAt.getTime(),
    usedAt: invite.usedAt?.getTime() ?? null,
    usedByName: invite.usedByUser?.name ?? invite.usedByUser?.email ?? null,
    createdAt: invite.createdAt.getTime(),
  }));

  const open = invites.filter((invite) => invite.state === "open").length;
  const used = invites.filter((invite) => invite.state === "used").length;

  // "Still onboarding" is anyone with a teammate row who hasn't finished —
  // approximated here by the cheapest signal, an unapproved verification.
  const onboarding = await prisma.teammate.count({
    where: { OR: [{ verification: null }, { verification: { status: { not: "APPROVED" } } }] },
  });

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-link" label="Open invites" value={open} color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-user-check" label="Invites redeemed" value={used} color="var(--accent)" />
        <StatCard icon="fa-solid fa-hourglass-half" label="Still onboarding" value={onboarding} color="var(--hue-gold)" />
      </StatGrid>

      <AdminTableToolbar
        initialQuery={q}
        placeholder="Search note, email or who redeemed it…"
        searchLabel="Search invites"
      />

      <OnboardingInvites invites={invites} origin={origin} />

      <TablePagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        hrefFor={(nextPage) => {
          const next = new URLSearchParams();
          if (q) next.set("q", q);
          next.set("page", String(nextPage));
          return `/dashboard/admin/onboarding?${next}`;
        }}
        label="Invites pagination"
      />
    </>
  );
}
