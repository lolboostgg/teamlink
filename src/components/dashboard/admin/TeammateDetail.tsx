"use client";

import { useState } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";
import { LANGUAGES } from "@/lib/i18n";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { DiscordTag } from "@/components/dashboard/DiscordTag";
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

export interface TeammateDetailView {
  id: string;
  teammateNo: number;
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
  reviewCount: number;
  reviewAverage: number | null;
}

export interface TeammateOrderRow {
  orderId: string;
  orderNo: number;
  gameName: string;
  option: string;
  priceEUR: string;
  status: string;
  candidateStatus: string;
  selected: boolean;
  createdAt: number;
}

type Tab = "general" | "orders" | "games" | "verification" | "security";

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
}: {
  teammate: TeammateDetailView;
  /** Null for roster rows that were never linked to a real login. */
  account: AccountSummary | null;
  orders: TeammateOrderRow[];
}) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("general");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "general", label: "General" },
    { key: "orders", label: "Orders", count: orders.length },
    { key: "games", label: "Game Profiles" },
    { key: "verification", label: "Verification & Payouts" },
    ...(account ? [{ key: "security" as const, label: "Security" }] : []),
  ];

  return (
    <>
      <header className="account-header">
        <span className="account-header__avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={teammate.avatarUrl || account?.avatarUrl || "/avatars/default.webp"} alt="" />
        </span>

        <div className="account-header__main">
          <h1 className="account-header__name">
            {teammate.name}
            <span className="account-role account-role--teammate">Teammate</span>
            <span
              className={`dashboard-pill ${teammate.available ? "dashboard-pill--success" : "dashboard-pill--muted"}`}
            >
              {teammate.available ? "available" : "unavailable"}
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
          <div className="dashboard-panel">
            <div className="dashboard-panel__head">
              <div>
                <div className="dashboard-panel__title">Overview</div>
                <div className="dashboard-panel__sub">Roster entry #{teammate.teammateNo}</div>
              </div>
            </div>
            <div className="account-overview">
              <div>
                <div className="account-overview__title">Teammate</div>
                <dl className="account-facts">
                  <div>
                    <dt>Rating</dt>
                    <dd>
                      {teammate.rating.toFixed(1)} ({teammate.reviewCount} review
                      {teammate.reviewCount === 1 ? "" : "s"})
                    </dd>
                  </div>
                  <div>
                    <dt>Sessions</dt>
                    <dd>{teammate.sessionsCount}</dd>
                  </div>
                  <div>
                    <dt>Timezone</dt>
                    <dd>{teammate.timezone || "—"}</dd>
                  </div>
                  <div>
                    <dt>Tagline</dt>
                    <dd>{teammate.tagline || "—"}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <div className="account-overview__title">Account</div>
                <dl className="account-facts">
                  <div>
                    <dt>Account</dt>
                    <dd>{account ? `#${account.accountNo}` : "not linked"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{account?.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Discord</dt>
                    <dd>
                      <DiscordTag
                        discordId={account?.discordId ?? null}
                        discordUsername={account?.discordUsername ?? null}
                        discordAvatar={account?.discordAvatar ?? null}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{account ? DATE.format(account.createdAt) : "—"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

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
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Game</th>
                  <th>Price</th>
                  <th>Dispatch</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId}>
                    <td className="dashboard-table__primary"><Link href={`/dashboard/admin/orders/${o.orderId}`}>#{o.orderNo}</Link><small>{o.option}</small></td>
                    <td>{o.gameName}</td>
                    <td>€{o.priceEUR}</td>
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
                    <td>{DATE.format(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <SecurityPanel userId={account.id} onSaved={() => showToast("Password changed.", "success")} />
        </div>
      )}
    </>
  );
}
