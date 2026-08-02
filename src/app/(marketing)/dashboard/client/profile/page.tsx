import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ClientProfileForm } from "@/components/dashboard/client/ClientProfileForm";

export const metadata: Metadata = { title: "Profile" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other admin/teammate pages, see lib/db.ts.
export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, avatarUrl: true } })
    : null;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Profile</div>
          <div className="dashboard-panel__sub">Your name, avatar and password</div>
        </div>
      </div>
      <ClientProfileForm
        initial={{ name: user?.name ?? "", email: user?.email ?? "", avatarUrl: user?.avatarUrl ?? "" }}
      />
    </div>
  );
}
