"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { countryName } from "@/lib/countries";
import { getGameBySlug } from "@/lib/games";
import { gameIcon } from "@/lib/gameArt";
import {
  acceptApplication,
  declineApplication,
  deleteApplication,
  reopenApplication,
} from "@/app/dashboard/admin/applications/actions";

export type ApplicationStatus = "PENDING" | "INVITED" | "DECLINED";

export interface ApplicationView {
  id: string;
  name: string;
  email: string;
  discord: string;
  country: string | null;
  games: string[];
  ranks: string | null;
  hours: string | null;
  experience: string | null;
  status: ApplicationStatus;
  createdAt: number;
  reviewedAt: number | null;
}

const STATUS_PILL: Record<ApplicationStatus, string> = {
  PENDING: "dashboard-pill--warning",
  INVITED: "dashboard-pill--success",
  DECLINED: "dashboard-pill--muted",
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: "Waiting",
  INVITED: "Invited",
  DECLINED: "Declined",
};

const STATUS_ICON: Record<ApplicationStatus, string> = {
  PENDING: "fa-solid fa-hourglass-half",
  INVITED: "fa-solid fa-paper-plane",
  DECLINED: "fa-solid fa-ban",
};

const FILTERS = [
  { key: "PENDING", label: "Waiting" },
  { key: "INVITED", label: "Invited" },
  { key: "DECLINED", label: "Declined" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const dayFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

function daysAgo(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function ApplicationsBoard({ applications }: { applications: ApplicationView[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterKey>("PENDING");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const tally: Record<FilterKey, number> = { all: applications.length, PENDING: 0, INVITED: 0, DECLINED: 0 };
    for (const a of applications) tally[a.status] += 1;
    return tally;
  }, [applications]);

  const visible = useMemo(
    () => (filter === "all" ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter],
  );

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string; inviteUrl?: string }>, success: string) {
    setBusyId(id);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          showToast(result.error ?? "That didn't work.", "error");
          return;
        }
        // The link comes back so it can be pasted straight into Discord —
        // waiting on a mail to arrive before you can chase somebody is the
        // kind of small friction that makes a queue stop being worked.
        if (result.inviteUrl) {
          await navigator.clipboard.writeText(result.inviteUrl).catch(() => undefined);
          showToast("Invited — invite link copied to your clipboard.", "success");
        } else {
          showToast(success, "success");
        }
        setConfirmDelete(null);
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">
            <i className="fa-solid fa-user-plus" aria-hidden="true" /> Teammate applications
          </div>
          <div className="dashboard-panel__sub">
            Accepting mails a one-time invite link and copies it for you. Declining keeps the row, which is what stops
            the same address applying again &mdash; delete it to let them start over.
          </div>
        </div>
      </div>

      <div className="application-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`table-filter-pill${filter === f.key ? " is-active" : ""}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="dashboard-empty">
          <i className="fa-solid fa-inbox" aria-hidden="true" />
          <p>{filter === "PENDING" ? "Nothing waiting — the queue is clear." : "Nothing here."}</p>
        </div>
      ) : (
        <ul className="application-list">
          {visible.map((a) => {
            const busy = pending && busyId === a.id;
            const expanded = openId === a.id;
            return (
              <li key={a.id} className={`application-card${busy ? " is-busy" : ""}`}>
                <div className="application-card__main">
                  <div className="application-card__who">
                    <div className="application-card__name">
                      {a.country && <FlagIcon iso={a.country} label={countryName(a.country) ?? a.country} />}
                      <strong>{a.name}</strong>
                      <span className={`dashboard-pill ${STATUS_PILL[a.status]}`}>
                        <i className={STATUS_ICON[a.status]} aria-hidden="true" /> {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    <div className="application-card__contact">
                      <a href={`mailto:${a.email}`}>{a.email}</a>
                      <span>
                        <i className="fa-brands fa-discord" aria-hidden="true" /> {a.discord}
                      </span>
                      <span title={dayFormat.format(a.createdAt)}>
                        <i className="fa-regular fa-clock" aria-hidden="true" /> {daysAgo(a.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="application-card__games">
                    {a.games.map((slug) => {
                      const game = getGameBySlug(slug);
                      return (
                        <span className="application-game" key={slug} title={game?.name ?? slug}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={gameIcon(slug)} alt="" loading="lazy" />
                          {game?.name ?? slug}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {(a.ranks || a.hours) && (
                  <div className="application-card__facts">
                    {a.ranks && (
                      <span>
                        <small>Ranks</small>
                        {a.ranks}
                      </span>
                    )}
                    {a.hours && (
                      <span>
                        <small>Available</small>
                        {a.hours}
                      </span>
                    )}
                  </div>
                )}

                {a.experience && (
                  <div className="application-card__note">
                    <p className={expanded ? "" : "is-clamped"}>{a.experience}</p>
                    <button type="button" onClick={() => setOpenId(expanded ? null : a.id)}>
                      {expanded ? "Show less" : "Read all"}
                    </button>
                  </div>
                )}

                <div className="application-card__actions">
                  {a.status !== "INVITED" && (
                    <button
                      type="button"
                      className="btn btn--vivid btn--sm"
                      disabled={busy}
                      onClick={() => run(a.id, () => acceptApplication(a.id), "Invited.")}
                    >
                      <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Accept &amp; invite
                    </button>
                  )}
                  {a.status === "PENDING" && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={busy}
                      onClick={() => run(a.id, () => declineApplication(a.id), "Declined.")}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" /> Decline
                    </button>
                  )}
                  {a.status === "DECLINED" && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={busy}
                      onClick={() => run(a.id, () => reopenApplication(a.id), "Back in the queue.")}
                    >
                      <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Reopen
                    </button>
                  )}

                  {/* Two-step, because deleting is the one action here that
                      also silently unblocks the email address. */}
                  {confirmDelete === a.id ? (
                    <span className="application-card__confirm">
                      Delete and let them apply again?
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        disabled={busy}
                        onClick={() => run(a.id, () => deleteApplication(a.id), "Deleted.")}
                      >
                        Delete
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="application-card__delete"
                      disabled={busy}
                      onClick={() => setConfirmDelete(a.id)}
                    >
                      <i className="fa-solid fa-trash" aria-hidden="true" /> Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
