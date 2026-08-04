import { getGameProfileConfig, type GameProfileEntry, type GameProfileMap } from "@/lib/gameProfiles";
import { GAMES } from "@/lib/games";

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  done: boolean;
  /** Shown under an unfinished step, e.g. which games still need a profile. */
  detail?: string;
}

/** What the checks need. Kept structural so callers can pass a Prisma row. */
export interface OnboardingSubject {
  avatarUrl: string | null;
  timezone: string | null;
  languages: unknown;
  gameSlugs: unknown;
  gameProfiles: unknown;
  verificationStatus: string | null;
  discordId: string | null;
}

/**
 * Pages a teammate may still reach while onboarding. Everything else is
 * blocked — the checklist links here, so locking these out would leave no
 * way to finish.
 */
export const ONBOARDING_ALLOWED_PATHS = [
  "/dashboard/teammate/onboarding",
  "/dashboard/teammate/verification",
  "/dashboard/teammate/connections",
  "/dashboard/teammate/profile",
];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/**
 * A game profile counts as filled once every section the game actually
 * defines has an answer. A game with no rank section can't be missing one,
 * so this asks the registry rather than assuming every game has all three.
 */
function gameProfileMissing(slugs: string[], profiles: GameProfileMap): string[] {
  return slugs.filter((slug) => {
    const config = getGameProfileConfig(slug);
    if (!config) return false;
    const entry: Partial<GameProfileEntry> = profiles[slug] ?? {};
    if (config.ranks && !entry.rank) return true;
    if (config.roles && (entry.roles?.length ?? 0) === 0) return true;
    if (config.pool && (entry.pool?.length ?? 0) === 0) return true;
    return false;
  });
}

export function onboardingSteps(subject: OnboardingSubject): OnboardingStep[] {
  const languages = asStringArray(subject.languages);
  const gameSlugs = asStringArray(subject.gameSlugs);
  const profiles = (subject.gameProfiles as GameProfileMap | null) ?? {};
  const missingProfiles = gameProfileMissing(gameSlugs, profiles);

  return [
    {
      key: "avatar",
      title: "Add a profile picture",
      description: "Clients pick who they play with by face — an empty avatar gets skipped.",
      icon: "fa-solid fa-camera",
      href: "/dashboard/teammate/profile",
      done: Boolean(subject.avatarUrl),
    },
    {
      key: "languages",
      title: "Pick your languages",
      description: "Used to match you with clients you can actually talk to.",
      icon: "fa-solid fa-language",
      href: "/dashboard/teammate/profile",
      done: languages.length > 0,
    },
    {
      key: "timezone",
      title: "Set your timezone",
      description: "So clients know when you're realistically online.",
      icon: "fa-regular fa-clock",
      href: "/dashboard/teammate/profile",
      done: Boolean(subject.timezone),
    },
    {
      key: "games",
      title: "Choose your games",
      description: "The games you want to be booked for.",
      icon: "fa-solid fa-gamepad",
      href: "/dashboard/teammate/profile",
      done: gameSlugs.length > 0,
    },
    {
      key: "game-profiles",
      title: "Fill out your game profiles",
      description: "Rank, roles and champion pool for each game you picked.",
      icon: "fa-solid fa-id-card",
      href: "/dashboard/teammate/profile",
      done: gameSlugs.length > 0 && missingProfiles.length === 0,
      detail:
        gameSlugs.length === 0
          ? "Pick your games first."
          : missingProfiles.length > 0
            ? `Still incomplete: ${missingProfiles
                .map((slug) => GAMES.find((game) => game.slug === slug)?.shortName ?? slug)
                .join(", ")}`
            : undefined,
    },
    {
      key: "discord",
      title: "Connect Discord",
      description: "Order alerts and client contact both run through Discord.",
      icon: "fa-brands fa-discord",
      href: "/dashboard/teammate/connections",
      done: Boolean(subject.discordId),
    },
    {
      key: "verification",
      title: "Verify your identity",
      description: "Required before any payout can be released.",
      icon: "fa-solid fa-shield-halved",
      href: "/dashboard/teammate/verification",
      done: subject.verificationStatus === "APPROVED",
      detail: subject.verificationStatus === "REJECTED" ? "Your last submission was rejected — check the note." : undefined,
    },
  ];
}

export function isOnboardingComplete(subject: OnboardingSubject): boolean {
  return onboardingSteps(subject).every((step) => step.done);
}
