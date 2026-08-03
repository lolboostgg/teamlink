import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DiscordConnection } from "@/components/dashboard/DiscordConnection";

export const metadata: Metadata = { title: "Connections" };
// Direct top-level Prisma query in a Server Component — same build-time-probe
// hazard as the other teammate pages, see lib/db.ts.
export const dynamic = "force-dynamic";

export default async function TeammateConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string }>;
}) {
  const { discord } = await searchParams;
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { discordId: true, discordUsername: true, discordAvatar: true },
      })
    : null;

  if (!user) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Connections</div>
            <div className="dashboard-panel__sub">Sign in to manage your connected accounts.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Connections</div>
          <div className="dashboard-panel__sub">
            Link Discord so dispatch invites, session updates and payout notices can reach you there as well.
          </div>
        </div>
      </div>

      <div className="settings-rows">
        <DiscordConnection
          discordId={user.discordId}
          discordUsername={user.discordUsername}
          discordAvatar={user.discordAvatar}
          returnTo="/dashboard/teammate/connections"
          status={discord}
        />
      </div>

      <p className="settings-note">
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Linking is live, but nothing is sent to
        Discord yet — the delivery side still has to be wired up.
      </p>
    </div>
  );
}
