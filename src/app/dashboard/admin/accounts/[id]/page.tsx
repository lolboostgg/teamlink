import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAccountDetail } from "@/lib/admin/accounts";
import { readGameProfiles } from "@/lib/teammateProfile";
import { AccountDetail } from "@/components/dashboard/admin/AccountDetail";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import type { LanguageCode } from "@/lib/i18n";
import type { PayoutMethodType } from "@/lib/payoutMethods";
import { readLoginActivity, readTwoFactor } from "@/lib/twoFactor";

export const metadata: Metadata = { title: "Account" };
// See src/app/dashboard/admin/page.tsx for why this is forced dynamic.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminAccountPage({ params }: Props) {
  const { id } = await params;
  const detail = await getAccountDetail(id);
  if (!detail) notFound();

  const { user, teammate } = detail;

  return (
    <>
      <LiveRefresh />
      <Link href="/dashboard/admin/users" className="account-back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to users
      </Link>
      <AccountDetail
        orders={detail.orders.map((order) => ({ id: order.id, orderNo: order.orderNo, gameSlug: order.gameSlug, gameName: order.gameName, option: order.option, status: order.status, priceEUR: order.priceEUR.toString(), createdAt: order.createdAt.getTime(), teammateName: order.candidates[0]?.teammate.name ?? null, teammateAvatarUrl: order.candidates[0]?.teammate.avatarUrl ?? null }))}
        account={{
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
          orderCount: detail.orderCount,
          completedCount: detail.completedCount,
          reviewCount: detail.reviewCount,
          reviewAverage: detail.reviewAverage,
          twoFactorEnabled: Boolean(readTwoFactor(user.notificationPrefs)),
          loginActivity: readLoginActivity(user.notificationPrefs),
        }}
        teammate={
          teammate
            ? {
                id: teammate.id,
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
                verification: teammate.verification
                  ? {
                      status: teammate.verification.status,
                      fullName: teammate.verification.fullName ?? "",
                      dateOfBirth: teammate.verification.dateOfBirth ?? "",
                      address: teammate.verification.address ?? "",
                      country: teammate.verification.country ?? "",
                      idFrontPath: teammate.verification.idFrontPath,
                      idBackPath: teammate.verification.idBackPath,
                      selfiePath: teammate.verification.selfiePath,
                      reviewNote: teammate.verification.reviewNote,
                      submittedAt: teammate.verification.submittedAt?.getTime() ?? null,
                    }
                  : null,
                payoutMethods: teammate.payoutMethods.map((m) => ({
                  id: m.id,
                  type: m.type as PayoutMethodType,
                  details: (m.details as Record<string, string> | null) ?? {},
                  isDefault: m.isDefault,
                })),
              }
            : null
        }
      />
    </>
  );
}
