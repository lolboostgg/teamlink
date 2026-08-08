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

export const metadata: Metadata = { title: "Teammate Dashboard" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other admin/teammate pages, see lib/db.ts.
export const dynamic = "force-dynamic";

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

  // Reviews used to be fetched and rendered here too. They have their own
  // page in the sidebar, and the average is on the sidebar profile — showing
  // six of them again on the overview was the bulk of its length.
  const earnings = teammate ? await loadTeammateEarnings(teammate.id) : null;

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

      <TeammateOverviewPanels balanceEUR={earnings?.balanceEUR ?? 0} pendingEUR={earnings?.pendingEUR ?? 0} />
      <ActiveOrderCard />
      <RulesPanel />
    </>
  );
}
