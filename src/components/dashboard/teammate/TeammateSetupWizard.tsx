"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastProvider";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { IconSelect } from "@/components/ui/IconSelect";
import { IconMultiSelect } from "@/components/ui/IconMultiSelect";
import { DocumentUpload, KYC_DOCUMENTS } from "@/components/dashboard/teammate/DocumentUpload";
import { DiscordConnection } from "@/components/dashboard/DiscordConnection";
import { TIMEZONE_OPTIONS } from "@/lib/timezones";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";
import { getGameProfileConfig, EMPTY_GAME_PROFILE, type GameProfileEntry, type GameProfileMap } from "@/lib/gameProfiles";
import { updateOwnProfile } from "@/app/dashboard/teammate/profile/actions";
import { savePersonalDetails, submitForReview } from "@/app/dashboard/teammate/verification/actions";
import type { VerificationView } from "@/components/dashboard/teammate/VerificationEditor";

export interface SetupInitial {
  avatarUrl: string;
  tagline: string;
  timezone: string;
  languages: LanguageCode[];
  gameSlugs: string[];
  gameProfiles: GameProfileMap;
}

interface Props {
  initial: SetupInitial;
  verification: VerificationView;
  storageReady: boolean;
  discord: { discordId: string | null; discordUsername: string | null; discordAvatar: string | null; status?: string };
}

type StepKey = "avatar" | "languages" | "timezone" | "games" | "game-profiles" | "discord" | "verification";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/**
 * The whole teammate setup in one place: every step opens its real control
 * inline instead of sending people off to another page and hoping they find
 * their way back. Profile answers are held as one draft and written through
 * the same server action the profile page uses, so nothing here is a second
 * implementation of the same save.
 */
export function TeammateSetupWizard({ initial, verification, storageReady, discord }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { update: updateSession } = useSession();
  const [pending, startTransition] = useTransition();

  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [languages, setLanguages] = useState<LanguageCode[]>(initial.languages);
  const [gameSlugs, setGameSlugs] = useState<string[]>(initial.gameSlugs);
  const [gameProfiles, setGameProfiles] = useState<GameProfileMap>(initial.gameProfiles);
  const [details, setDetails] = useState({
    fullName: verification.fullName,
    dateOfBirth: verification.dateOfBirth,
    address: verification.address,
    country: verification.country,
  });

  // Games with a registry entry that still has an unanswered section.
  const configuredGames = gameSlugs
    .map((slug) => ({ game: GAMES.find((entry) => entry.slug === slug), config: getGameProfileConfig(slug) }))
    .filter((entry): entry is { game: (typeof GAMES)[number]; config: NonNullable<ReturnType<typeof getGameProfileConfig>> } =>
      Boolean(entry.game && entry.config),
    );

  const profilesComplete =
    gameSlugs.length > 0 &&
    configuredGames.every(({ game, config }) => {
      const entry: Partial<GameProfileEntry> = gameProfiles[game.slug] ?? {};
      if (config.ranks && !entry.rank) return false;
      if (config.roles && (entry.roles?.length ?? 0) === 0) return false;
      if (config.pool && (entry.pool?.length ?? 0) === 0) return false;
      return true;
    });

  const doneMap: Record<StepKey, boolean> = {
    avatar: Boolean(avatarUrl),
    languages: languages.length > 0,
    timezone: Boolean(timezone),
    games: gameSlugs.length > 0,
    "game-profiles": profilesComplete,
    discord: Boolean(discord.discordId),
    verification: verification.status === "APPROVED",
  };

  const order: StepKey[] = ["avatar", "languages", "timezone", "games", "game-profiles", "discord", "verification"];
  const firstOpen = order.find((key) => !doneMap[key]) ?? order[order.length - 1];
  // null = every step collapsed, after someone folds the open one away.
  const [expanded, setExpanded] = useState<StepKey | null>(firstOpen);

  function patchProfile(slug: string, change: Partial<GameProfileEntry>) {
    setGameProfiles((prev) => ({ ...prev, [slug]: { ...EMPTY_GAME_PROFILE, ...prev[slug], ...change } }));
  }

  /** Persists the whole profile draft, then moves on to the next open step. */
  function saveProfile(successMessage: string, advanceFrom: StepKey) {
    startTransition(async () => {
      try {
        await updateOwnProfile({ tagline: initial.tagline, timezone, avatarUrl, languages, gameSlugs, gameProfiles });
        // Keeps the header avatar in step — see trigger:"update" in auth.ts.
        await updateSession({});
        showToast(successMessage, "success");
        const next = order.slice(order.indexOf(advanceFrom) + 1).find((key) => !doneMap[key]);
        if (next) setExpanded(next);
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Couldn't save — try again.", "error");
      }
    });
  }

  const steps: { key: StepKey; title: string; description: string; body: React.ReactNode }[] = [
    {
      key: "avatar",
      title: "Add a profile picture",
      description: "Clients pick who they play with by face — an empty avatar gets skipped.",
      body: (
        <>
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} label="" />
          <StepActions
            disabled={pending || !avatarUrl}
            onSave={() => saveProfile("Profile picture saved.", "avatar")}
          />
        </>
      ),
    },
    {
      key: "languages",
      title: "Pick your languages",
      description: "Used to match you with clients you can actually talk to.",
      body: (
        <>
          <div className="chip-check-group">
            {LANGUAGES.map((language) => (
              <label key={language.code} className="chip-check">
                <input
                  type="checkbox"
                  checked={languages.includes(language.code)}
                  onChange={() => setLanguages((prev) => toggle(prev, language.code))}
                />
                <FlagIcon iso={language.flagIso} />
                <span>{language.label}</span>
              </label>
            ))}
          </div>
          <StepActions
            disabled={pending || languages.length === 0}
            onSave={() => saveProfile("Languages saved.", "languages")}
          />
        </>
      ),
    },
    {
      key: "timezone",
      title: "Set your timezone",
      description: "So clients know when you're realistically online.",
      body: (
        <>
          <IconSelect
            label="Timezone"
            value={timezone || null}
            options={TIMEZONE_OPTIONS}
            searchable
            placeholder="Search for your city or offset"
            onChange={(value) => setTimezone(value ?? "")}
          />
          <StepActions disabled={pending || !timezone} onSave={() => saveProfile("Timezone saved.", "timezone")} />
        </>
      ),
    },
    {
      key: "games",
      title: "Choose your games",
      description: "The games you want to be booked for.",
      body: (
        <>
          <div className="chip-check-group">
            {GAMES.map((game) => (
              <label key={game.slug} className="chip-check chip-check--avatar">
                <input
                  type="checkbox"
                  checked={gameSlugs.includes(game.slug)}
                  onChange={() => setGameSlugs((prev) => toggle(prev, game.slug))}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gameIcon(game.slug)} alt="" className="chip-check__icon" />
                <span>{game.name}</span>
              </label>
            ))}
          </div>
          <StepActions
            disabled={pending || gameSlugs.length === 0}
            onSave={() => saveProfile("Games saved.", "games")}
          />
        </>
      ),
    },
    {
      key: "game-profiles",
      title: "Fill out your game profiles",
      description: "Rank, roles and champion pool for each game you picked.",
      body:
        configuredGames.length === 0 ? (
          <p className="setup-step__empty">Pick your games in the step above first.</p>
        ) : (
          <>
            {configuredGames.map(({ game, config }) => {
              const entry = gameProfiles[game.slug] ?? EMPTY_GAME_PROFILE;
              return (
                <div className="setup-game" key={game.slug}>
                  <div className="setup-game__head">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gameIcon(game.slug)} alt="" />
                    <strong>{game.name}</strong>
                  </div>

                  {config.ranks && (
                    <div className="form-row">
                      <label>{config.ranks.label}</label>
                      <IconSelect
                        label={`${game.name} ${config.ranks.label}`}
                        value={entry.rank}
                        options={config.ranks.options}
                        onChange={(rank) => patchProfile(game.slug, { rank })}
                      />
                    </div>
                  )}

                  {config.roles && (
                    <div className="form-row">
                      <label>{config.roles.label}</label>
                      <div className="chip-check-group">
                        {config.roles.options.map((option) => (
                          <label key={option.value} className={`chip-check${option.icon ? " chip-check--avatar" : ""}`}>
                            <input
                              type="checkbox"
                              checked={entry.roles.includes(option.value)}
                              onChange={() => patchProfile(game.slug, { roles: toggle(entry.roles, option.value) })}
                            />
                            {option.icon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={option.icon} alt="" className="chip-check__icon" />
                            ) : option.glyph ? (
                              <i className={`${option.glyph} chip-check__glyph`} aria-hidden="true" />
                            ) : null}
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.pool && (
                    <div className="form-row">
                      <label>{config.pool.label}</label>
                      <IconMultiSelect
                        label={config.pool.label}
                        value={entry.pool}
                        options={config.pool.options}
                        placeholder={`Add ${config.pool.label.replace(/ pool$/i, "").toLowerCase()}`}
                        onChange={(pool) => patchProfile(game.slug, { pool })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <StepActions
              disabled={pending || !profilesComplete}
              onSave={() => saveProfile("Game profiles saved.", "game-profiles")}
            />
          </>
        ),
    },
    {
      key: "discord",
      title: "Connect Discord",
      description: "Order alerts and client contact both run through Discord.",
      body: (
        <DiscordConnection
          discordId={discord.discordId}
          discordUsername={discord.discordUsername}
          discordAvatar={discord.discordAvatar}
          returnTo="/dashboard/teammate/onboarding"
          status={discord.status}
        />
      ),
    },
    {
      key: "verification",
      title: "Verify your identity",
      description: "Required before any payout can be released.",
      body: (
        <>
          {verification.status === "REJECTED" && verification.reviewNote && (
            <p className="form-row__error">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {verification.reviewNote}
            </p>
          )}
          {!storageReady && (
            <p className="form-row__hint">
              Document uploads are switched off &mdash; SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY aren&rsquo;t
              configured yet.
            </p>
          )}

          <div className="form-row-grid">
            <div className="form-row">
              <label htmlFor="setup-kyc-name">Full name</label>
              <input
                id="setup-kyc-name"
                value={details.fullName}
                onChange={(event) => setDetails({ ...details, fullName: event.target.value })}
              />
            </div>
            <div className="form-row">
              <label htmlFor="setup-kyc-dob">Date of birth</label>
              <input
                id="setup-kyc-dob"
                placeholder="DD-MM-YYYY"
                value={details.dateOfBirth}
                onChange={(event) => setDetails({ ...details, dateOfBirth: event.target.value })}
              />
            </div>
            <div className="form-row">
              <label htmlFor="setup-kyc-address">Address</label>
              <input
                id="setup-kyc-address"
                value={details.address}
                onChange={(event) => setDetails({ ...details, address: event.target.value })}
              />
            </div>
            <div className="form-row">
              <label htmlFor="setup-kyc-country">Country</label>
              <input
                id="setup-kyc-country"
                value={details.country}
                onChange={(event) => setDetails({ ...details, country: event.target.value })}
              />
            </div>
          </div>

          <div className="kyc-docs">
            {KYC_DOCUMENTS.map((doc) => (
              <DocumentUpload
                key={doc.kind}
                kind={doc.kind}
                label={doc.label}
                path={verification[doc.field]}
                disabled={!storageReady}
                onUploaded={() => router.refresh()}
              />
            ))}
          </div>

          <div className="setup-step__actions">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await savePersonalDetails(details);
                    showToast("Details saved.", "success");
                    router.refresh();
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : "Couldn't save.", "error");
                  }
                })
              }
            >
              Save details
            </button>
            <button
              type="button"
              className="btn btn--vivid"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    // Details are written first so a filled-in form doesn't
                    // fail the completeness check on unsaved input.
                    await savePersonalDetails(details);
                    await submitForReview();
                    showToast("Identity verified.", "success");
                    router.refresh();
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : "Couldn't submit.", "error");
                  }
                })
              }
            >
              Submit verification
            </button>
          </div>
        </>
      ),
    },
  ];

  const doneCount = order.filter((key) => doneMap[key]).length;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Finish your setup</div>
          <div className="dashboard-panel__sub">
            Your dashboard unlocks once every step is done. You can leave and come back &mdash; nothing is lost.
          </div>
        </div>
        <span className="dashboard-pill dashboard-pill--muted">
          {doneCount} of {order.length} done
        </span>
      </div>

      <div
        className="onboarding-progress"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={order.length}
      >
        <span style={{ width: `${(doneCount / order.length) * 100}%` }} />
      </div>

      <ol className="setup-steps">
        {steps.map((step, index) => {
          const done = doneMap[step.key];
          const open = expanded === step.key;
          return (
            <li key={step.key} className={`setup-step${done ? " is-done" : ""}${open ? " is-open" : ""}`}>
              <button
                type="button"
                className="setup-step__head"
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : step.key)}
              >
                <span className="setup-step__mark" aria-hidden="true">
                  {done ? <i className="fa-solid fa-check" /> : <span>{index + 1}</span>}
                </span>
                <span className="setup-step__copy">
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </span>
                {done && <span className="setup-step__state">Done</span>}
                <i className="fa-solid fa-chevron-down setup-step__chevron" aria-hidden="true" />
              </button>

              {open && <div className="setup-step__body">{step.body}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepActions({ disabled, onSave }: { disabled: boolean; onSave: () => void }) {
  return (
    <div className="setup-step__actions">
      <button type="button" className="btn btn--vivid" disabled={disabled} onClick={onSave}>
        Save &amp; continue
      </button>
    </div>
  );
}
