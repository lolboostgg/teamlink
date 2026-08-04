"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";
import { LANGUAGES } from "@/lib/i18n";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { PrivateImage } from "@/components/ui/PrivateImage";
import { DiscordTag } from "@/components/dashboard/DiscordTag";
import { TeammateProfileForm, type TeammateProfileFormValue } from "@/components/dashboard/TeammateProfileForm";
import { updateTeammateProfile } from "@/app/dashboard/admin/teammates/actions";
import { setUserPassword, updateAccountDetails, reviewVerification } from "@/app/dashboard/admin/accounts/actions";
import { PAYOUT_LABELS, describePayoutMethod, PAYOUT_FIELDS, type PayoutMethodType } from "@/lib/payoutMethods";
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
  discordUsername: string | null;
  discordAvatar: string | null;
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
  verification: VerificationView | null;
  payoutMethods: PayoutMethodView[];
}

export interface VerificationView {
  status: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  country: string;
  idFrontPath: string | null;
  idBackPath: string | null;
  selfiePath: string | null;
  reviewNote: string | null;
  submittedAt: number | null;
}

export interface PayoutMethodView {
  id: string;
  type: PayoutMethodType;
  details: Record<string, string>;
  isDefault: boolean;
}

export interface AccountOrderRow { id: string; orderNo: number; gameName: string; option: string; status: string; priceEUR: string; createdAt: number; }
type Section = "overview" | "orders" | "account" | "games" | "verification" | "security";

const STATUS_PILL: Record<string, string> = {
  UNSUBMITTED: "dashboard-pill--muted",
  PENDING: "dashboard-pill--warning",
  APPROVED: "dashboard-pill--success",
  REJECTED: "dashboard-pill--warning",
};

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

export function AccountDetail({ account, teammate, orders }: { account: AccountSummary; teammate: TeammateSummary | null; orders: AccountOrderRow[] }) {
  const { showToast } = useToast();
  const [section, setSection] = useState<Section>("overview");

  const sections: { key: Section; label: string }[] = [
    { key: "overview", label: "General" },
    { key: "orders", label: `Orders (${orders.length})` },
    { key: "account", label: "Account" },
    ...(teammate
      ? [
          {
            key: "games" as const,
            label: "Game Profiles",
          },
          {
            key: "verification" as const,
            label: "Verification & Payouts",
          },
        ]
      : []),
    { key: "security", label: "Security" },
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
                <i className="fa-brands fa-discord" aria-hidden="true" />{" "}
                {account.discordUsername ?? account.discordId}
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

      <nav className="profile-tabs profile-tabs--page" aria-label="Account sections">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`profile-tab${section === s.key ? " is-active" : ""}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="dashboard-panel">
        {section === "overview" && <OverviewPanel account={account} teammate={teammate} />}

        {section === "orders" && (orders.length ? <div className="admin-account-orders"><table className="dashboard-table"><thead><tr><th>Order</th><th>Game</th><th>Option</th><th>Status</th><th>Price</th><th>Date</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="dashboard-table__primary"><Link href={`/dashboard/admin/orders/${order.id}`}>#{order.orderNo}</Link></td><td>{order.gameName}</td><td>{order.option}</td><td><span className="dashboard-pill dashboard-pill--muted">{order.status.toLowerCase().replaceAll("_", " ")}</span></td><td>€{order.priceEUR}</td><td>{DATE.format(order.createdAt)}</td></tr>)}</tbody></table></div> : <div className="dashboard-empty dashboard-empty--compact"><i className="fa-solid fa-receipt" /><p>No orders yet.</p></div>)}

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

        {section === "verification" && teammate && (
          <VerificationPanel
            teammateId={teammate.id}
            verification={teammate.verification}
            methods={teammate.payoutMethods}
            onReviewed={(approved) => showToast(approved ? "Verification approved." : "Verification rejected.", "success")}
          />
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
            <dd>
              <DiscordTag
                discordId={account.discordId}
                discordUsername={account.discordUsername}
                discordAvatar={account.discordAvatar}
              />
            </dd>
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

export function VerificationPanel({
  teammateId,
  verification,
  methods,
  onReviewed,
}: {
  teammateId: string;
  verification: VerificationView | null;
  methods: PayoutMethodView[];
  onReviewed: (approved: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const documents = verification
    ? [
        { label: "ID front", path: verification.idFrontPath },
        { label: "ID back", path: verification.idBackPath },
        { label: "Selfie", path: verification.selfiePath },
      ]
    : [];

  function review(approve: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await reviewVerification(teammateId, approve, note);
        setNote("");
        onReviewed(approve);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save — try again.");
      }
    });
  }

  return (
    <>
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">
            Identity verification{" "}
            <span className={`dashboard-pill ${STATUS_PILL[verification?.status ?? "UNSUBMITTED"]}`}>
              {(verification?.status ?? "UNSUBMITTED").toLowerCase()}
            </span>
          </div>
          <div className="dashboard-panel__sub">
            {verification?.submittedAt
              ? `Submitted ${DATE.format(verification.submittedAt)}`
              : "Nothing submitted yet"}
          </div>
        </div>
      </div>

      {verification ? (
        <>
          <dl className="account-facts">
            <div>
              <dt>Full name</dt>
              <dd>{verification.fullName || "—"}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{verification.dateOfBirth || "—"}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{verification.address || "—"}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{verification.country || "—"}</dd>
            </div>
          </dl>

          <div className="kyc-docs">
            {documents.map((doc) => (
              <div key={doc.label} className="kyc-doc">
                <div className="kyc-doc__head">
                  <span>{doc.label}</span>
                  {!doc.path && <span className="kyc-doc__state">missing</span>}
                </div>
                {doc.path && (
                  <PrivateImage
                    src={`/api/kyc/view?path=${encodeURIComponent(doc.path)}`}
                    name={doc.path}
                    alt={doc.label}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="form-row">
            <label htmlFor="kyc-note">Rejection reason</label>
            <textarea
              id="kyc-note"
              value={note}
              placeholder="Only needed when rejecting — the teammate sees this."
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p className="form-row__error">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
            </p>
          )}

          <div className="teammate-profile-form__actions">
            <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => review(false)}>
              Reject
            </button>
            <button type="button" className="btn btn--vivid" disabled={pending} onClick={() => review(true)}>
              Approve
            </button>
          </div>
        </>
      ) : (
        <p className="form-row__hint">This teammate hasn&rsquo;t started verification yet.</p>
      )}

      <hr className="client-profile-form__divider" />

      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Payout methods</div>
          <div className="dashboard-panel__sub">Read-only — only the teammate can change these</div>
        </div>
      </div>

      {methods.length === 0 ? (
        <p className="form-row__hint">No payout method saved yet.</p>
      ) : (
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Details</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.id}>
                <td className="dashboard-table__primary">{PAYOUT_LABELS[m.type]}</td>
                <td>
                  {describePayoutMethod(m.type, m.details)}
                  <div className="account-stat__sub">
                    {PAYOUT_FIELDS[m.type]
                      .filter((f) => m.details[f.key])
                      .map((f) => `${f.label}: ${m.details[f.key]}`)
                      .join(" · ")}
                  </div>
                </td>
                <td>{m.isDefault && <span className="dashboard-pill dashboard-pill--success">default</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function AccountPanel({ account, onSaved }: { account: AccountSummary; onSaved: () => void }) {
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

export function SecurityPanel({ userId, onSaved }: { userId: string; onSaved: () => void }) {
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
