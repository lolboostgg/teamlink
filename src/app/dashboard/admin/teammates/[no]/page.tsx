import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeammateDetail } from "@/lib/admin/teammateDetail";
import { loadTeammateEarnings } from "@/lib/teammateEarnings";
import { readGameProfiles } from "@/lib/teammateProfile";
import { TeammateDetail } from "@/components/dashboard/admin/TeammateDetail";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import type { LanguageCode } from "@/lib/i18n";
import type { PayoutMethodType } from "@/lib/payoutMethods";
import { readLoginActivity, readTwoFactor } from "@/lib/twoFactor";

export const metadata: Metadata = { title: "Teammate" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ no: string }>;
}

export default async function AdminTeammatePage({ params }: Props) {
  const { no } = await params;
  // Either form: #12 from a URL, or a raw id from an older link.
  const detail = await getTeammateDetail(no);
  if (!detail) notFound();

  const earnings = await loadTeammateEarnings(detail.teammate.id);

  const { teammate, candidacies, reviews } = detail;
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
          avatarFocusX: teammate.avatarFocusX,
          avatarFocusY: teammate.avatarFocusY,
          avatarZoom: teammate.avatarZoom,
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
                bannedAt: user.bannedAt?.getTime() ?? null,
                bannedReason: user.bannedReason,
                createdAt: user.createdAt.getTime(),
                orderCount: 0,
                completedCount: 0,
                reviewCount: detail.reviewCount,
                reviewAverage: detail.reviewAverage,
                twoFactorEnabled: Boolean(readTwoFactor(user.notificationPrefs)),
                loginActivity: readLoginActivity(user.notificationPrefs),
              }
            : null
        }
        earnings={earnings}
        reviews={reviews.map((review) => ({
          id: review.id,
          client: review.clientUser?.name || review.order.customerLabel || "Anonymous",
          gameName: review.order.gameName,
          gameSlug: review.order.gameSlug,
          option: review.order.option,
          orderNo: review.order.orderNo,
          clientAvatarUrl: review.clientUser?.avatarUrl ?? null,
          clientProfileHref: review.clientUser ? `/dashboard/admin/accounts/${review.clientUser.accountNo}` : null,
          rating: review.rating,
          date: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(review.createdAt),
        }))}
        orders={candidacies.map((c) => ({
          orderId: c.orderId,
          orderNo: c.order.orderNo,
          gameName: c.order.gameName,
          gameSlug: c.order.gameSlug,
          clientName: c.order.clientUser?.name || c.order.clientUser?.email || c.order.customerLabel,
          clientAvatarUrl: c.order.clientUser?.avatarUrl ?? null,
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
