import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { ActiveOrderCard } from "@/components/dashboard/teammate/ActiveOrderCard";
import { TeammateOverviewPanels } from "@/components/dashboard/teammate/TeammateOverviewPanels";
import { payoutForOrder } from "@/lib/payoutSplit";
import { VerificationBanner } from "@/components/dashboard/teammate/VerificationBanner";

export const metadata: Metadata = { title: "Teammate Dashboard" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other admin/teammate pages, see lib/db.ts.
export const dynamic = "force-dynamic";

export default async function TeammateDashboardPage() {
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          available: true,
          balanceEUR: true,
          sessionsCount: true,
          verification: { select: { status: true } },
          _count: { select: { payoutMethods: true } },
        },
      })
    : null;
  const displayName = teammate?.name || session?.user?.name || "there";

  // What the orders in flight will pay out on completion. Same split rule as
  // creditOrderPayout(): the order's pot divided across the selected team.
  const inFlight = teammate
    ? await prisma.order.findMany({
        where: {
          status: { in: ["ASSIGNED", "IN_PROGRESS"] },
          candidates: { some: { teammateId: teammate.id, selected: true } },
        },
        select: { priceEUR: true, teammatePayoutEUR: true, _count: { select: { candidates: { where: { selected: true } } } } },
      })
    : [];
  const pendingEUR = inFlight.reduce(
    (sum, order) => sum + payoutForOrder(order) / Math.max(1, order._count.candidates),
    0,
  );

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
        balanceEUR={Number(teammate?.balanceEUR ?? 0)}
        pendingEUR={pendingEUR}
        sessionsCount={teammate?.sessionsCount ?? 0}
      />
      <ActiveOrderCard />
    </>
  );
}
