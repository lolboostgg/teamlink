import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsScreen } from "@/components/dashboard/client/SettingsScreen";
import { sanitizeNotificationPrefs } from "@/lib/notificationPrefs";

export const metadata: Metadata = { title: "Settings" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other dashboard pages, see lib/db.ts.
export const dynamic = "force-dynamic";

export default async function ClientSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string }>;
}) {
  const { discord } = await searchParams;
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          accountNo: true,
          name: true,
          email: true,
          avatarUrl: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true,
          notificationPrefs: true,
        },
      })
    : null;

  if (!user) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Settings</div>
            <div className="dashboard-panel__sub">Sign in to manage your account.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SettingsScreen
      account={{
        accountNo: user.accountNo,
        name: user.name ?? "",
        email: user.email,
        avatarUrl: user.avatarUrl ?? "",
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        discordAvatar: user.discordAvatar,
        discordStatus: discord,
        prefs: sanitizeNotificationPrefs(user.notificationPrefs),
      }}
    />
  );
}
