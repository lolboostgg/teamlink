import { ViewTransition } from "react";
import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { DashboardAuthGate } from "@/components/dashboard/DashboardAuthGate";
import { DispatchFlow } from "@/components/dashboard/teammate/DispatchFlow";
import { prisma } from "@/lib/db";
import { discordAvatarUrl } from "@/lib/discord";
import { loadOnboardingSubject } from "@/lib/teammateGate";
import { isOnboardingComplete } from "@/lib/teammateOnboarding";
import { accessibleDashboards } from "@/lib/roles";

// Sibling of the (marketing) route group, so /dashboard/* gets its own
// shell (sidebar + topbar) instead of inheriting the marketing Header/
// Footer. The ViewTransition here mirrors the one in (marketing)/layout.tsx
// via matching transition types (dashboard-enter/dashboard-exit) so the two
// sides animate as one continuous motion instead of two independent swaps.
// In-dashboard navigation (sidebar links, role switch) carries no
// transition type, so it hits default:"none" — a quiet instant update.
// DashboardAuthGate wraps the *entire* shell (not just the content area) —
// when logged out you see only the lock screen, no half-rendered sidebar.
//
// initiallyAuthenticated (from the server-fetched session here) is what
// stops the "log in to view your dashboard" flash on every load for people
// who ARE logged in — without it, the root SessionProvider starts every
// page at status:"loading" and fetches the session client-side from
// scratch, so client components briefly render the signed-out UI before
// that resolves. See DashboardAuthGate for why this is a plain prop and
// not a second nested SessionProvider (that broke the header instead).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const teammate = session?.user?.id
      ? await prisma.teammate.findUnique({
        where: { userId: session.user.id },
        select: {
          name: true,
          avatarUrl: true,
          avatarFocusX: true,
          avatarFocusY: true,
          avatarZoom: true,
          rating: true,
          available: true,
          balanceEUR: true,
          user: { select: { avatarUrl: true, discordId: true, discordAvatar: true } },
          _count: { select: { candidacies: { where: { selected: true } } } },
        },
      })
    : null;
  // Drives the sidebar's locked state, so a teammate mid-onboarding sees why
  // the other sections don't respond instead of being bounced back by the
  // per-page gate with no explanation.
  const onboarding =
    session?.user?.id && session.user.role === "TEAMMATE"
      ? await loadOnboardingSubject(session.user.id)
      : null;
  const onboardingPending = onboarding ? !isOnboardingComplete(onboarding) : false;

  // The account's own picture, independent of any teammate row.
  //
  // Everything below used to hang off `teammate`, which is null for an admin
  // and for a plain client — so their uploaded avatar never reached the
  // sidebar or the topbar and both fell back to initials. The session cannot
  // stand in for it either: an uploaded image is a data URL and
  // sessionSafeAvatar() strips those out of the token on purpose, since a
  // multi-kilobyte cookie breaks the login outright.
  const account = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, avatarUrl: true, discordId: true, discordAvatar: true },
      })
    : null;
  // Older uploads were truncated to exactly 2,000 characters by the profile
  // sanitizer; a partial data URL can never render.
  const accountUpload =
    account?.avatarUrl?.startsWith("data:image/") && account.avatarUrl.length <= 2_000
      ? null
      : account?.avatarUrl ?? null;
  const accountAvatar =
    accountUpload || discordAvatarUrl(account?.discordId ?? null, account?.discordAvatar ?? null) || null;

  const storedAvatar = teammate?.avatarUrl || teammate?.user?.avatarUrl || null;
  // Older uploads were truncated to exactly 2,000 characters by the profile
  // sanitizer. A partial data URL can never render, so fall through to the
  // Discord/default avatar until the user saves the image again.
  const usableStoredAvatar = storedAvatar?.startsWith("data:image/") && storedAvatar.length <= 2_000
    ? null
    : storedAvatar;
  const teammateProfile = teammate
    ? {
        name: teammate.name,
        avatarUrl:
          usableStoredAvatar ||
          discordAvatarUrl(teammate.user?.discordId ?? null, teammate.user?.discordAvatar ?? null) ||
          "/avatars/default.webp",
        avatarFocusX: teammate.avatarFocusX,
        avatarFocusY: teammate.avatarFocusY,
        avatarZoom: teammate.avatarZoom,
        rating: teammate.rating,
        sessionsCount: teammate._count.candidacies,
        available: teammate.available,
        // Decimal doesn't cross the server/client boundary — it has to be a
        // plain number before it gets there.
        balanceEUR: Number(teammate.balanceEUR),
      }
    : null;
  return (
    <DashboardAuthGate initiallyAuthenticated={!!session}>
      <>
        <DispatchFlow />
        <div className="dashboard-shell">
          <DashboardSidebar
            teammate={teammateProfile}
            accountName={account?.name ?? null}
            accountAvatarUrl={accountAvatar}
            onboardingPending={onboardingPending}
            dashboards={accessibleDashboards(session?.user?.role, Boolean(teammate))}
          />
          <div className="dashboard-shell__main">
            <DashboardTopbar avatarUrl={teammateProfile?.avatarUrl ?? accountAvatar} />
            <ViewTransition
              enter={{ "dashboard-enter": "dash-in-fwd", default: "none" }}
              exit={{ "dashboard-exit": "dash-out-back", default: "none" }}
              default="none"
            >
              <main className="dashboard-content">{children}</main>
            </ViewTransition>
          </div>
        </div>
      </>
    </DashboardAuthGate>
  );
}
