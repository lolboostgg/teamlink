import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeammateDetail } from "@/lib/admin/teammateDetail";
import { readGameProfiles } from "@/lib/teammateProfile";
import { TeammateDetail } from "@/components/dashboard/admin/TeammateDetail";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import type { LanguageCode } from "@/lib/i18n";
import type { PayoutMethodType } from "@/lib/payoutMethods";

export const metadata: Metadata = { title: "Teammate" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ no: string }>;
}

export default async function AdminTeammatePage({ params }: Props) {
  const { no } = await params;
  const teammateNo = Number(no);
  if (!Number.isInteger(teammateNo)) notFound();

  const detail = await getTeammateDetail(teammateNo);
  if (!detail) notFound();

  const { teammate, candidacies } = detail;
  const user = teammate.user;
  const v = teammate.verification;

  return (
    <>
      <LiveRefresh />
      <Link href="/dashboard/admin/teammates" className="account-back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to teammates
      </Link>

      <TeammateDetail
        teammate={{
          id: teammate.id,
          teammateNo: teammate.teammateNo,
          name: teammate.name,
          tagline: teammate.tagline ?? "",
          timezone: teammate.timezone ?? "",
          avatarUrl: teammate.avatarUrl ?? "",
          rating: teammate.rating,
          sessionsCount: teammate.sessionsCount,
          available: teammate.available,
          languages: (teammate.languages as LanguageCode[] | null) ?? [],
          gameSlugs: (teammate.gameSlugs as string[] | null) ?? [],
          gameProfiles: readGameProfiles(teammate),
          reviewCount: detail.reviewCount,
          reviewAverage: detail.reviewAverage,
          verification: v
            ? {
                status: v.status,
                fullName: v.fullName ?? "",
                dateOfBirth: v.dateOfBirth ?? "",
                address: v.address ?? "",
                country: v.country ?? "",
                idFrontPath: v.idFrontPath,
                idBackPath: v.idBackPath,
                selfiePath: v.selfiePath,
                reviewNote: v.reviewNote,
                submittedAt: v.submittedAt?.getTime() ?? null,
              }
            : null,
          payoutMethods: teammate.payoutMethods.map((m) => ({
            id: m.id,
            type: m.type as PayoutMethodType,
            details: (m.details as Record<string, string> | null) ?? {},
            isDefault: m.isDefault,
          })),
        }}
        account={
          user
            ? {
                id: user.id,
                accountNo: user.accountNo,
                name: user.name ?? "",
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
                discordId: user.discordId,
                discordUsername: user.discordUsername,
                discordAvatar: user.discordAvatar,
                creditBalanceCents: user.creditBalanceCents,
                createdAt: user.createdAt.getTime(),
                orderCount: 0,
                completedCount: 0,
                reviewCount: detail.reviewCount,
                reviewAverage: detail.reviewAverage,
              }
            : null
        }
        orders={candidacies.map((c) => ({
          orderId: c.orderId,
          gameName: c.order.gameName,
          option: c.order.option,
          priceEUR: c.order.priceEUR.toString(),
          status: c.order.status,
          candidateStatus: c.status,
          selected: c.selected,
          createdAt: c.order.createdAt.getTime(),
        }))}
      />
    </>
  );
}
