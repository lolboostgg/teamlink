"use client";

import { useState, useTransition } from "react";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";
import { LANGUAGES } from "@/lib/i18n";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { TeammateProfileForm, type TeammateProfileFormValue } from "@/components/dashboard/TeammateProfileForm";
import { updateTeammateProfile } from "@/app/dashboard/admin/teammates/actions";
import { setUserPassword, updateAccountDetails } from "@/app/dashboard/admin/accounts/actions";
import { useToast } from "@/components/ui/ToastProvider";
import type { GameProfileMap } from "@/lib/gameProfiles";
import type { LanguageCode } from "@/lib/i18n";

export interface AccountSummary {
  id: string;
  accountNo: number;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  discordId: string | null;
  creditBalanceCents: number;
  createdAt: number;
  orderCount: number;
  completedCount: number;
  reviewCount: number;
  reviewAverage: number | null;
}

export interface TeammateSummary {
  id: string;
  name: string;
  tagline: string;
  timezone: string;
  avatarUrl: string;
  rating: number;
  sessionsCount: number;
  available: boolean;
  languages: LanguageCode[];
  gameSlugs: string[];
  gameProfiles: GameProfileMap;
}

type Section = "overview" | "account" | "games" | "security";

const EUR = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

function StatTile({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  return (
    <div className="account-stat">
      <div className="account-stat__icon">
        <i className={icon} aria-hidden="true" />
      </div>
      <div>
        <div className="account-stat__value">{value}</div>
        <div className="account-stat__label">{label}</div>
        {sub && <div className="account-stat__sub">{sub}</div>}
      </div>
    </div>
  );
}

export function AccountDetail({ account, teammate }: { account: AccountSummary; teammate: TeammateSummary | null }) {
  const { showToast } = useToast();
  const [section, setSection] = useState<Section>("overview");

  const sections: { key: Section; label: string; sub: string; icon: string }[] = [
    { key: "overview", label: "Overview", sub: "Profile at a glance", icon: "fa-solid fa-id-card" },
    { key: "account", label: "Account", sub: "Name and email", icon: "fa-solid fa-user-gear" },
    ...(teammate
      ? [
          {
            key: "games" as const,
            label: "Game Profiles",
            sub: "Ranks, roles and pools",
            icon: "fa-solid fa-gamepad",
          },
        ]
      : []),
    { key: "security", label: "Security", sub: "Reset the password", icon: "fa-solid fa-shield-halved" },
  ];

  return (
    <>
      <header className="account-header">
        <span className="account-header__avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={teammate?.avatarUrl || account.avatarUrl || "/avatars/default.webp"} alt="" />
        </span>

        <div className="account-header__main">
          <h1 className="account-header__name">
            {teammate?.name || account.name || account.email}
            <span className={`account-role account-role--${account.role.toLowerCase()}`}>{account.role}</span>
            {teammate && (
              <span className={`dashboard-pill ${teammate.available ? "dashboard-pill--success" : "dashboard-pill--muted"}`}>
                {teammate.available ? "available" : "unavailable"}
              </span>
            )}
          </h1>

          <div className="account-header__meta">
            <span>
              <i className="fa-solid fa-hashtag" aria-hidden="true" />
              {account.accountNo}
            </span>
            <span>
              <i className="fa-solid fa-envelope" aria-hidden="true" /> {account.email}
            </span>
            {account.discordId && (
              <span>
                <i className="fa-brands fa-discord" aria-hidden="true" /> {account.discordId}
              </span>
            )}
            <span>
              <i className="fa-solid fa-calendar" aria-hidden="true" /> joined {DATE.format(account.createdAt)}
            </span>
          </div>

          {teammate && teammate.gameSlugs.length > 0 && (
            <div className="account-header__games">
              {teammate.gameSlugs.map((slug) => {
                const game = GAMES.find((g) => g.slug === slug);
                if (!game) return null;
                return (
                  <span key={slug} className="game-tag">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gameIcon(slug)} alt="" />
                    {game.shortName}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <div className="account-stats">
        <StatTile
          icon="fa-solid fa-wallet"
          label="Store credit"
          value={EUR.format(account.creditBalanceCents / 100)}
        />
        <StatTile
          icon="fa-solid fa-bag-shopping"
          label="Orders placed"
          value={String(account.orderCount)}
          sub={`${account.completedCount} completed`}
        />
        {teammate ? (
          <>
            <StatTile icon="fa-solid fa-headset" label="Sessions played" value={String(teammate.sessionsCount)} />
            <StatTile
              icon="fa-solid fa-star"
              label="Rating"
              value={teammate.rating.toFixed(1)}
              sub={`${account.reviewCount} review${account.reviewCount === 1 ? "" : "s"}`}
            />
          </>
        ) : (
          <StatTile icon="fa-solid fa-star" label="Reviews written" value={String(account.reviewCount)} />
        )}
      </div>

      <nav className="account-sections" aria-label="Account sections">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`account-section-card${section === s.key ? " is-active" : ""}`}
            onClick={() => setSection(s.key)}
          >
            <span className="account-section-card__icon">
              <i className={s.icon} aria-hidden="true" />
            </span>
            <span>
              <strong>{s.label}</strong>
              <em>{s.sub}</em>
            </span>
          </button>
        ))}
      </nav>

      <div className="dashboard-panel">
        {section === "overview" && <OverviewPanel account={account} teammate={teammate} />}

        {section === "account" && (
          <AccountPanel
            account={account}
            onSaved={() => showToast("Account updated.", "success")}
          />
        )}

        {section === "games" && teammate && (
          <>
            <div className="dashboard-panel__head">
              <div>
                <div className="dashboard-panel__title">Game Profiles</div>
                <div className="dashboard-panel__sub">
                  Ranks, roles and character pools — and which games this teammate is listed for
                </div>
              </div>
            </div>
            <TeammateProfileForm
              showAdminFields
              initial={{
                name: teammate.name,
                tagline: teammate.tagline,
                timezone: teammate.timezone,
                avatarUrl: teammate.avatarUrl,
                languages: teammate.languages,
                gameSlugs: teammate.gameSlugs,
                gameProfiles: teammate.gameProfiles,
              }}
              onSave={async (value: TeammateProfileFormValue) => {
                await updateTeammateProfile(teammate.id, value);
                showToast("Game profile saved.", "success");
              }}
            />
          </>
        )}

        {section === "security" && (
          <SecurityPanel userId={account.id} onSaved={() => showToast("Password changed.", "success")} />
        )}
      </div>
    </>
  );
}

function OverviewPanel({ account, teammate }: { account: AccountSummary; teammate: TeammateSummary | null }) {
  return (
    <div className="account-overview">
      <div>
        <div className="account-overview__title">Account</div>
        <dl className="account-facts">
          <div>
            <dt>Account</dt>
            <dd>#{account.accountNo}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{account.role}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{account.email}</dd>
          </div>
          <div>
            <dt>Discord</dt>
            <dd>{account.discordId ?? "—"}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{DATE.format(account.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {teammate && (
        <div>
          <div className="account-overview__title">Teammate</div>
          <dl className="account-facts">
            <div>
              <dt>Timezone</dt>
              <dd>{teammate.timezone || "—"}</dd>
            </div>
            <div>
              <dt>Tagline</dt>
              <dd>{teammate.tagline || "—"}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd className="account-facts__langs">
                {teammate.languages.length === 0
                  ? "—"
                  : teammate.languages.map((code) => {
                      const lang = LANGUAGES.find((l) => l.code === code);
                      return lang ? <FlagIcon key={code} iso={lang.flagIso} /> : null;
                    })}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

function AccountPanel({ account, onSaved }: { account: AccountSummary; onSaved: () => void }) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="teammate-profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await updateAccountDetails(account.id, { name, email });
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save — try again.");
          }
        });
      }}
    >
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Account Settings</div>
          <div className="dashboard-panel__sub">The login identity behind this profile</div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="acc-name">Username</label>
        <input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="acc-email">Email</label>
        <input id="acc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      {error && (
        <p className="form-row__error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="teammate-profile-form__actions">
        <button type="submit" className="btn btn--vivid" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function SecurityPanel({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="teammate-profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) {
          setError("The two passwords don't match.");
          return;
        }
        startTransition(async () => {
          try {
            await setUserPassword(userId, password);
            setPassword("");
            setConfirm("");
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save — try again.");
          }
        });
      }}
    >
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Reset password</div>
          <div className="dashboard-panel__sub">
            Sets a new password immediately — the account keeps any active session, so tell the owner what it is.
          </div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="acc-pw">New password</label>
        <input
          id="acc-pw"
          type={show ? "text" : "password"}
          value={password}
          minLength={8}
          required
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="form-row">
        <label htmlFor="acc-pw2">Repeat password</label>
        <input
          id="acc-pw2"
          type={show ? "text" : "password"}
          value={confirm}
          minLength={8}
          required
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      <label className="chip-check">
        <input type="checkbox" checked={show} onChange={() => setShow((v) => !v)} />
        <i className="fa-solid fa-eye chip-check__glyph" aria-hidden="true" />
        <span>Show passwords</span>
      </label>

      {error && (
        <p className="form-row__error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="teammate-profile-form__actions">
        <button type="submit" className="btn btn--vivid" disabled={pending || password.length < 8}>
          {pending ? "Saving..." : "Set password"}
        </button>
      </div>
    </form>
  );
}
