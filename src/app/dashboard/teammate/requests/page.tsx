import type { Metadata } from "next";
import { OpenRequestsList } from "@/components/dashboard/teammate/OpenRequestsList";
import { requireOnboardedTeammate } from "@/lib/teammateGate";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Open requests" };
export const dynamic = "force-dynamic";

export default async function TeammateRequestsPage() {
  await requireOnboardedTeammate();
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({ where: { userId: session.user.id }, select: { available: true } })
    : null;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Open requests</div>
          <div className="dashboard-panel__sub">
            Orders you&rsquo;ve been invited to. Accepting puts you in front of the customer, who then picks.
          </div>
        </div>
      </div>

      <OpenRequestsList initialOnline={teammate?.available ?? false} />
    </div>
  );
}
