"use client";

import { useState } from "react";
import Link from "next/link";
import { GameMark } from "@/components/dashboard/GameMark";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";
import { LANGUAGES } from "@/lib/i18n";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { DiscordTag } from "@/components/dashboard/DiscordTag";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { useToast } from "@/components/ui/ToastProvider";
import { TeammateProfileForm, type TeammateProfileFormValue } from "@/components/dashboard/TeammateProfileForm";
import { updateTeammateProfile } from "@/app/dashboard/admin/teammates/actions";
import {
  AccountPanel,
  SecurityPanel,
  VerificationPanel,
  type AccountSummary,
  type VerificationView,
  type PayoutMethodView,
} from "@/components/dashboard/admin/AccountDetail";
import type { GameProfileMap } from "@/lib/gameProfiles";
import type { LanguageCode } from "@/lib/i18n";
import { EarningsLedger } from "@/components/dashboard/teammate/EarningsLedger";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import type { EarningsSummary } from "@/lib/earnings";
import { ReviewsList, type DisplayReview } from "@/components/dashboard/teammate/ReviewsList";
import { TeammateActionsMenu } from "@/components/dashboard/admin/TeammateActionsMenu";

export interface TeammateDetailView {
  id: string;
  teammateNo: number;
  name: string;
  tagline: string;
  timezone: string;
  avatarUrl: string;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
  rating: number;
  sessionsCount: number;
  available: boolean;
  languages: LanguageCode[];
  gameSlugs: string[];
  gameProfiles: GameProfileMap;
  verification: VerificationView | null;
  payoutMethods: PayoutMethodView[];
  reviewCount: number;
  reviewAverage: number | null;
}

export interface TeammateOrderRow {
  orderId: string;
  orderNo: number;
  gameName: string;
  gameSlug: string;
  clientName: string;
  clientAvatarUrl: string | null;
  option: string;
  priceEUR: string;
  status: string;
  candidateStatus: string;
  selected: boolean;
  createdAt: number;
}

type Tab = "general" | "orders" | "earnings" | "reviews" | "games" | "verification" | "security";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const STATUS_PILL: Record<string, string> = {
  COMPLETED: "dashboard-pill--success",
  IN_PROGRESS: "dashboard-pill--warning",
  CANCELLED: "dashboard-pill--muted",
};

export function TeammateDetail({
  teammate,
  account,
  orders,
  earnings,
  reviews,
}: {
  teammate: TeammateDetailView;
  /** Null for roster rows that were never linked to a real login. */
  account: AccountSummary | null;
  orders: TeammateOrderRow[];
  earnings: EarningsSummary;
  reviews: DisplayReview[];
}) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("general");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "general", label: "General" },
    { key: "orders", label: "Orders", count: orders.length },
    { key: "earnings", label: "Earnings", count: earnings.rows.length },
    { key: "reviews", label: "Reviews", count: reviews.length },
    { key: "games", label: "Game Profiles" },
    { key: "verification", label: "Verification & Payouts" },
    ...(account ? [{ key: "security" as const, label: "Security" }] : []),
  ];

  return (
    <>
      <header className="account-header">
        <span className="account-header__avatar">
          <SafeAvatarImage src={teammate.avatarUrl || account?.avatarUrl} alt={teammate.name} />
        </span>

        <TeammateActionsMenu
          teammateId={teammate.id}
          teammateName={teammate.name}
          balanceEUR={earnings.balanceEUR}
        />

        <div className="account-header__main">
          <h1 className="account-header__name">
            {teammate.name}
            <span className="account-role account-role--teammate">Teammate</span>
            <span
              className={`dashboard-pill ${teammate.available ? "dashboard-pill--success" : "dashboard-pill--muted"}`}
            >
              {teammate.available ? "ready" : "unavailable"}
            </span>
          </h1>

          <div className="account-header__meta">
            <span>
              <i className="fa-solid fa-hashtag" aria-hidden="true" />
              {teammate.teammateNo}
            </span>
            <span>
              <i className="fa-solid fa-envelope" aria-hidden="true" /> {account?.email ?? "no account linked"}
            </span>
            {teammate.timezone && (
              <span>
                <i className="fa-solid fa-clock" aria-hidden="true" /> {teammate.timezone}
              </span>
            )}
            {teammate.languages.length > 0 && (
              <span className="account-facts__langs">
                {teammate.languages.map((code) => {
                  const lang = LANGUAGES.find((l) => l.code === code);
                  return lang ? <FlagIcon key={code} iso={lang.flagIso} /> : null;
                })}
              </span>
            )}
          </div>

          {teammate.gameSlugs.length > 0 && (
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

      <nav className="profile-tabs profile-tabs--page" aria-label="Teammate sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`profile-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count !== undefined && <span className="profile-tab__count">{t.count}</span>}
          </button>
        ))}
      </nav>

      {tab === "general" && (
        <>
          <section className="teammate-admin-summary">
            <div className="teammate-admin-summary__stats">
              <article><span className="teammate-admin-summary__icon teammate-admin-summary__icon--rating"><i className="fa-solid fa-star" /></span><div><strong>{teammate.rating.toFixed(1)}</strong><small>{teammate.reviewCount} review{teammate.reviewCount === 1 ? "" : "s"}</small></div></article>
              <article><span className="teammate-admin-summary__icon teammate-admin-summary__icon--sessions"><i className="fa-solid fa-gamepad" /></span><div><strong>{teammate.sessionsCount}</strong><small>Sessions played</small></div></article>
              <article><span className="teammate-admin-summary__icon teammate-admin-summary__icon--orders"><i className="fa-solid fa-receipt" /></span><div><strong>{orders.length}</strong><small>Orders received</small></div></article>
              <article><span className={`teammate-admin-summary__icon ${teammate.available ? "teammate-admin-summary__icon--online" : ""}`}><i className="fa-solid fa-signal" /></span><div><strong>{teammate.available ? "Online" : "Offline"}</strong><small>Dispatch status</small></div></article>
            </div>
            <div className="teammate-admin-summary__details">
              <div className="teammate-admin-summary__block">
                <div className="teammate-admin-summary__heading"><span><i className="fa-solid fa-headset" /> Profile details</span><small>Roster #{teammate.teammateNo}</small></div>
                <dl><div><dt>Timezone</dt><dd>{teammate.timezone || "—"}</dd></div><div><dt>Languages</dt><dd className="account-facts__langs">{teammate.languages.length ? teammate.languages.map((code) => { const lang = LANGUAGES.find((l) => l.code === code); return lang ? <FlagIcon key={code} iso={lang.flagIso} label={lang.label} /> : null; }) : "—"}</dd></div><div className="is-wide"><dt>Tagline</dt><dd>{teammate.tagline || "No tagline added"}</dd></div></dl>
              </div>
              <div className="teammate-admin-summary__block">
                <div className="teammate-admin-summary__heading"><span><i className="fa-solid fa-link" /> Linked account</span><small>{account ? "Connected" : "Not linked"}</small></div>
                <dl><div><dt>Account ID</dt><dd>{account ? `#${account.accountNo}` : "—"}</dd></div><div><dt>Joined</dt><dd>{account ? DATE.format(account.createdAt) : "—"}</dd></div><div className="is-wide"><dt>Email</dt><dd>{account?.email ?? "—"}</dd></div><div className="is-wide"><dt>Discord</dt><dd><DiscordTag discordId={account?.discordId ?? null} discordUsername={account?.discordUsername ?? null} discordAvatar={account?.discordAvatar ?? null} /></dd></div></dl>
              </div>
            </div>
          </section>

          {account ? (
            <div className="dashboard-panel">
              <AccountPanel account={account} onSaved={() => showToast("Account updated.", "success")} />
            </div>
          ) : (
            <p className="form-row__hint">
              This roster entry has no login behind it — promote the matching user on the Users page to link one.
            </p>
          )}
        </>
      )}

      {tab === "orders" && (
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Orders</div>
              <div className="dashboard-panel__sub">Every dispatch this teammate was offered, newest first</div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="dashboard-empty">
              <i className="fa-solid fa-receipt" aria-hidden="true" />
              <p>No dispatches yet.</p>
            </div>
          ) : (
            <table className="dashboard-table admin-profile-orders">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Order ID</th>
                  <th>Option</th>
                  <th>Client</th>
                  <th>Dispatch</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId}>
                    <td><span className="client-order-game"><GameMark slug={o.gameSlug} /><strong>{o.gameName}</strong></span></td>
                    <td className="dashboard-table__primary"><Link href={`/dashboard/admin/orders/${o.orderNo}`}>#{o.orderNo}</Link></td>
                    <td><span className="client-order-option"><strong>{o.option}</strong></span></td>
                    <td><span className="client-order-teammate"><span className="client-order-teammate__avatar"><SafeAvatarImage src={o.clientAvatarUrl} alt={o.clientName} /></span><strong>{o.clientName}</strong></span></td>
                    <td>
                      {o.selected ? (
                        <span className="dashboard-pill dashboard-pill--success">played</span>
                      ) : (
                        <span className="dashboard-pill dashboard-pill--muted">{o.candidateStatus.toLowerCase()}</span>
                      )}
                    </td>
                    <td>
                      <span className={`dashboard-pill ${STATUS_PILL[o.status] ?? "dashboard-pill--muted"}`}>
                        {o.status.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>€{o.priceEUR}</td>
                    <td>{DATE.format(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "earnings" && (
        <>
          <StatGrid>
            <StatCard icon="fa-solid fa-wallet" label="Available balance" value={earnings.balanceEUR} currency color="var(--hue-green)" />
            <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={earnings.pendingEUR} currency color="var(--hue-gold)" />
            <StatCard icon="fa-solid fa-sack-dollar" label="Earned all time" value={earnings.earnedEUR} currency color="var(--accent)" />
            <StatCard icon="fa-solid fa-arrow-up-from-bracket" label="Paid out" value={earnings.paidOutEUR} currency color="var(--hue-purple)" />
          </StatGrid>

          <div className="dashboard-panel">
            <div className="dashboard-panel__head">
              <div>
                <div className="dashboard-panel__title">Earnings ledger</div>
                <div className="dashboard-panel__sub">
                  Append-only — corrections are booked as a new entry rather than an edit
                </div>
              </div>
            </div>
            <EarningsLedger rows={earnings.rows} emptyHint="This teammate hasn't completed a paid session yet." />
          </div>
        </>
      )}

      {tab === "reviews" && (
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Client reviews</div>
              <div className="dashboard-panel__sub">
                {reviews.length > 0
                  ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}${teammate.reviewAverage !== null ? ` · ${teammate.reviewAverage.toFixed(1)} average` : ""}`
                  : "What clients said after a completed session"}
              </div>
            </div>
          </div>
          {reviews.length > 0 ? (
            <ReviewsList reviews={reviews} />
          ) : (
            <div className="dashboard-empty dashboard-empty--compact">
              <i className="fa-solid fa-star-half-stroke" aria-hidden="true" />
              <p>No reviews yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === "games" && (
        <div className="dashboard-panel">
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
              avatarFocusX: teammate.avatarFocusX,
              avatarFocusY: teammate.avatarFocusY,
              avatarZoom: teammate.avatarZoom,
              languages: teammate.languages,
              gameSlugs: teammate.gameSlugs,
              gameProfiles: teammate.gameProfiles,
            }}
            onSave={async (value: TeammateProfileFormValue) => {
              await updateTeammateProfile(teammate.id, value);
              showToast("Game profile saved.", "success");
            }}
          />
        </div>
      )}

      {tab === "verification" && (
        <div className="dashboard-panel">
          <VerificationPanel
            teammateId={teammate.id}
            verification={teammate.verification}
            methods={teammate.payoutMethods}
            onReviewed={(approved) =>
              showToast(approved ? "Verification approved." : "Verification rejected.", "success")
            }
          />
        </div>
      )}

      {tab === "security" && account && (
        <div className="dashboard-panel">
          <SecurityPanel userId={account.id} twoFactorEnabled={account.twoFactorEnabled} loginActivity={account.loginActivity} onSaved={() => showToast("Password changed.", "success")} />
        </div>
      )}
    </>
  );
}
