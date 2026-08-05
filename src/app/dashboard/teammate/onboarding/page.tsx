import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { readGameProfiles } from "@/lib/teammateProfile";
import { loadOnboardingSubject } from "@/lib/teammateGate";
import { isOnboardingComplete } from "@/lib/teammateOnboarding";
import { TeammateSetupWizard } from "@/components/dashboard/teammate/TeammateSetupWizard";
import type { LanguageCode } from "@/lib/i18n";

export const metadata: Metadata = { title: "Finish your setup" };
export const dynamic = "force-dynamic";

export default async function TeammateOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string }>;
}) {
  const { discord } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    include: {
      verification: true,
      user: { select: { discordId: true, discordUsername: true, discordAvatar: true } },
    },
  });

  if (!teammate) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Finish your setup</div>
            <div className="dashboard-panel__sub">No teammate profile is linked to this account yet.</div>
          </div>
        </div>
      </div>
    );
  }

  // Sitting on a completed checklist would be a dead end. Re-derived from the
  // same helper the gate uses so the two can't disagree.
  const subject = await loadOnboardingSubject(session.user.id);
  if (subject && isOnboardingComplete(subject)) redirect("/dashboard/teammate");

  const verification = teammate.verification;

  return (
    <TeammateSetupWizard
      initial={{
        avatarUrl: teammate.avatarUrl ?? "",
        avatarFocusX: teammate.avatarFocusX,
        avatarFocusY: teammate.avatarFocusY,
        avatarZoom: teammate.avatarZoom,
        tagline: teammate.tagline ?? "",
        timezone: teammate.timezone ?? "",
        languages: ((teammate.languages as LanguageCode[] | null) ?? []),
        gameSlugs: ((teammate.gameSlugs as string[] | null) ?? []),
        gameProfiles: readGameProfiles(teammate),
      }}
      verification={{
        status: verification?.status ?? "UNSUBMITTED",
        fullName: verification?.fullName ?? "",
        dateOfBirth: verification?.dateOfBirth ?? "",
        address: verification?.address ?? "",
        country: verification?.country ?? "",
        idFrontPath: verification?.idFrontPath ?? null,
        idBackPath: verification?.idBackPath ?? null,
        selfiePath: verification?.selfiePath ?? null,
        reviewNote: verification?.reviewNote ?? null,
      }}
      storageReady={isStorageConfigured()}
      discord={{
        discordId: teammate.user?.discordId ?? null,
        discordUsername: teammate.user?.discordUsername ?? null,
        discordAvatar: teammate.user?.discordAvatar ?? null,
        status: discord,
      }}
    />
  );
}
