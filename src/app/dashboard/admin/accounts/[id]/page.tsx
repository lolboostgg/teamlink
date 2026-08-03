import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAccountDetail } from "@/lib/admin/accounts";
import { readGameProfiles } from "@/lib/teammateProfile";
import { AccountDetail } from "@/components/dashboard/admin/AccountDetail";
import type { LanguageCode } from "@/lib/i18n";

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
      <Link href="/dashboard/admin/users" className="account-back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to users
      </Link>
      <AccountDetail
        account={{
          id: user.id,
          accountNo: user.accountNo,
          name: user.name ?? "",
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          discordId: user.discordId,
          creditBalanceCents: user.creditBalanceCents,
          createdAt: user.createdAt.getTime(),
          orderCount: detail.orderCount,
          completedCount: detail.completedCount,
          reviewCount: detail.reviewCount,
          reviewAverage: detail.reviewAverage,
        }}
        teammate={
          teammate
            ? {
                id: teammate.id,
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
              }
            : null
        }
      />
    </>
  );
}
