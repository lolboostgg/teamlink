import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { AvailabilityToggle } from "@/components/dashboard/teammate/AvailabilityToggle";
import { ActiveOrderCard } from "@/components/dashboard/teammate/ActiveOrderCard";
import { TeammateOverviewPanels } from "@/components/dashboard/teammate/TeammateOverviewPanels";

export const metadata: Metadata = { title: "Teammate Dashboard" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other admin/teammate pages, see lib/db.ts.
export const dynamic = "force-dynamic";

export default async function TeammateDashboardPage() {
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({
        where: { userId: session.user.id },
        select: { name: true, available: true },
      })
    : null;
  const displayName = teammate?.name || session?.user?.name || "there";

  return (
    <>
      <WelcomeBanner
        name={displayName}
        message="Stay online to keep receiving booking requests."
        links={[
          { href: "/dashboard/teammate/sessions", label: "Sessions", icon: "fa-solid fa-calendar-check" },
          { href: "/dashboard/teammate/chat", label: "Chat", icon: "fa-solid fa-comments" },
        ]}
      />

      <AvailabilityToggle initialOnline={teammate?.available ?? false} />
      <TeammateOverviewPanels />
      <ActiveOrderCard />
    </>
  );
}
