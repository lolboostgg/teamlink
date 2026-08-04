import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isOnboardingComplete, type OnboardingSubject } from "@/lib/teammateOnboarding";

const ONBOARDING_HREF = "/dashboard/teammate/onboarding";

/** Everything the checklist needs, in one query. */
export async function loadOnboardingSubject(userId: string): Promise<OnboardingSubject | null> {
  const teammate = await prisma.teammate.findUnique({
    where: { userId },
    select: {
      avatarUrl: true,
      timezone: true,
      languages: true,
      gameSlugs: true,
      gameProfiles: true,
      verification: { select: { status: true } },
      user: { select: { discordId: true } },
    },
  });
  if (!teammate) return null;

  return {
    avatarUrl: teammate.avatarUrl,
    timezone: teammate.timezone,
    languages: teammate.languages,
    gameSlugs: teammate.gameSlugs,
    gameProfiles: teammate.gameProfiles,
    verificationStatus: teammate.verification?.status ?? null,
    discordId: teammate.user?.discordId ?? null,
  };
}

/**
 * Call at the top of every teammate page that should stay locked until
 * onboarding is finished.
 *
 * This is an explicit call per page rather than a check in the layout,
 * because a React Server Component layout has no way to know which route is
 * rendering — and the pages the checklist links to (profile, connections,
 * verification) have to stay reachable while it is still incomplete.
 */
export async function requireOnboardedTeammate() {
  const session = await auth();
  if (!session?.user?.id) return;
  if (session.user.role !== "TEAMMATE") return;

  const subject = await loadOnboardingSubject(session.user.id);
  // No teammate row yet is an admin/data problem, not something to trap
  // somebody in the checklist over — the pages handle that case themselves.
  if (!subject) return;
  if (!isOnboardingComplete(subject)) redirect(ONBOARDING_HREF);
}
