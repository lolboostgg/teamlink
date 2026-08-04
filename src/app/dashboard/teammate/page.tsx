import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { ActiveOrderCard } from "@/components/dashboard/teammate/ActiveOrderCard";
import { TeammateOverviewPanels } from "@/components/dashboard/teammate/TeammateOverviewPanels";
import { VerificationBanner } from "@/components/dashboard/teammate/VerificationBanner";
import { RulesPanel } from "@/components/dashboard/teammate/RulesPanel";
import { requireOnboardedTeammate } from "@/lib/teammateGate";
import { loadTeammateEarnings } from "@/lib/teammateEarnings";
import type { DisplayReview } from "@/components/dashboard/teammate/ReviewsList";

export const metadata: Metadata = { title: "Teammate Dashboard" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other admin/teammate pages, see lib/db.ts.
export const dynamic = "force-dynamic";

const reviewDate = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function TeammateDashboardPage() {
  await requireOnboardedTeammate();
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          available: true,
          sessionsCount: true,
          verification: { select: { status: true } },
          _count: { select: { payoutMethods: true } },
        },
      })
    : null;
  const displayName = teammate?.name || session?.user?.name || "there";

  // The rating comes from the reviews table, not from this browser's order
  // history — that was showing a dash while the sidebar showed a real number.
  const [earnings, reviewAgg, reviewRows] = teammate
    ? await Promise.all([
        loadTeammateEarnings(teammate.id),
        prisma.review.aggregate({ where: { teammateId: teammate.id }, _avg: { rating: true }, _count: true }),
        prisma.review.findMany({
          where: { teammateId: teammate.id },
          include: { order: true, clientUser: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ])
    : [null, null, []];

  const reviews: DisplayReview[] = reviewRows.map((review) => ({
    id: review.id,
    client: review.clientUser?.name || review.order.customerLabel || "Anonymous",
    gameName: review.order.gameName,
    gameSlug: review.order.gameSlug,
    option: review.order.option,
    orderNo: review.order.orderNo,
    clientAvatarUrl: review.clientUser?.avatarUrl ?? null,
    rating: review.rating,
    date: reviewDate.format(review.createdAt),
  }));

  return (
    <>
      <WelcomeBanner
        name={displayName}
        message="Stay online to keep receiving booking requests."
        links={[
          { href: "/dashboard/teammate/sessions", label: "Sessions", icon: "fa-solid fa-calendar-check" },
        ]}
      />

      {teammate && (
        <VerificationBanner
          status={teammate.verification?.status ?? "UNSUBMITTED"}
          hasPayoutMethod={teammate._count.payoutMethods > 0}
        />
      )}

      <TeammateOverviewPanels
        balanceEUR={earnings?.balanceEUR ?? 0}
        pendingEUR={earnings?.pendingEUR ?? 0}
        earnedEUR={earnings?.earnedEUR ?? 0}
        sessionsCount={teammate?.sessionsCount ?? 0}
        ratingAverage={reviewAgg?._avg.rating ?? null}
        reviewCount={reviewAgg?._count ?? 0}
        reviews={reviews}
      />
      <ActiveOrderCard />
      <RulesPanel />
    </>
  );
}
