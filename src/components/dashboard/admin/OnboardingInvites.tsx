"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { createInvite, revokeInvite, deleteInvite } from "@/app/dashboard/admin/onboarding/actions";
import type { InviteState } from "@/lib/teammateInvites";

export interface InviteView {
  id: string;
  token: string;
  note: string | null;
  email: string | null;
  state: InviteState;
  openCount: number;
  expiresAt: number;
  usedAt: number | null;
  usedByName: string | null;
  createdAt: number;
}

const STATE_PILL: Record<InviteState, string> = {
  open: "dashboard-pill--success",
  used: "dashboard-pill--muted",
  expired: "dashboard-pill--warning",
  revoked: "dashboard-pill--warning",
};

const STATE_ICON: Record<InviteState, string> = {
  open: "fa-solid fa-link",
  used: "fa-solid fa-circle-check",
  expired: "fa-solid fa-hourglass-end",
  revoked: "fa-solid fa-ban",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "used", label: "Used" },
  { key: "expired", label: "Expired" },
  { key: "revoked", label: "Revoked" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const DAY_PRESETS = [1, 7, 14, 30];
const MIN_DAYS = 1;
const MAX_DAYS = 90;

// Split into date and time so each row's two timestamps read as two short
// lines rather than one long string the eye has to parse word by word.
const dayFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

function When({ at }: { at: number }) {
  return (
    <span className="invite-when">
      <strong>{dayFormat.format(at)}</strong>
      <small>{timeFormat.format(at)}</small>
    </span>
  );
}

export function OnboardingInvites({ invites, origin }: { invites: InviteView[]; origin: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(7);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const daysValid = Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS;

  const counts = useMemo(() => {
    const tally: Record<FilterKey, number> = { all: invites.length, open: 0, used: 0, expired: 0, revoked: 0 };
    for (const invite of invites) tally[invite.state] += 1;
    return tally;
  }, [invites]);

  const visible = useMemo(
    () => (filter === "all" ? invites : invites.filter((invite) => invite.state === filter)),
    [invites, filter],
  );

  function run(fn: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await fn();
        showToast(success, "success");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      }
    });
  }

  async function copyLink(token: string) {
    const url = `${origin}/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      showToast("Invite link copied.", "success");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is blocked outside a secure context — show the URL so it
      // can still be selected by hand rather than failing silently.
      showToast(url, "info");
    }
  }

  return (
    <>
      <div className="dashboard-panel invite-panel invite-form">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">
              <i className="fa-solid fa-user-plus" aria-hidden="true" /> Invite a teammate
            </div>
            <div className="dashboard-panel__sub">
              Creates a one-time link. Whoever opens it picks their own password &mdash; the link is spent the moment an
              account is created, so forwarding it can&rsquo;t produce a second one.
            </div>
          </div>
        </div>

        <div className="form-row-grid">
          <div className="form-row">
            <label htmlFor="invite-note">Who is this for?</label>
            <input
              id="invite-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Name or Discord handle — just for your own reference"
            />
          </div>
          <div className="form-row">
            <label htmlFor="invite-email">Pre-fill email (optional)</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="They can still change it"
            />
          </div>
        </div>

        {/* Expiry and the submit button share one footer bar. As its own grid
            cell the day count left half a row empty and pushed the button out
            on a line of its own. */}
        <div className="invite-form__foot">
          <div className="invite-form__expiry">
            <span className="invite-form__expiry-label">Valid for</span>
            <div className="invite-form__presets">
              {DAY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`invite-preset${days === preset ? " is-active" : ""}`}
                  aria-pressed={days === preset}
                  onClick={() => setDays(preset)}
                >
                  {preset === 1 ? "1 day" : `${preset} days`}
                </button>
              ))}
              <label className={`invite-preset invite-preset--custom${daysValid ? "" : " is-invalid"}`}>
                <input
                  type="number"
                  min={MIN_DAYS}
                  max={MAX_DAYS}
                  value={Number.isNaN(days) ? "" : days}
                  aria-label="Days until the invite link expires"
                  onChange={(event) => setDays(event.target.valueAsNumber)}
                />
                <span>days</span>
              </label>
            </div>
            {!daysValid && (
              <small className="invite-form__warning">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Pick a whole number of days
                between {MIN_DAYS} and {MAX_DAYS}.
              </small>
            )}
          </div>

          <button
            type="button"
            className="btn btn--vivid invite-form__submit"
            disabled={pending || !daysValid}
            onClick={() =>
              run(async () => {
                await createInvite({ note, email, days });
                setNote("");
                setEmail("");
              }, "Invite link created.")
            }
          >
            <i className="fa-solid fa-link" aria-hidden="true" /> Create invite link
          </button>
        </div>
      </div>

      <div className="dashboard-panel invite-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">
              <i className="fa-solid fa-link" aria-hidden="true" /> Invite links
            </div>
            <div className="dashboard-panel__sub">
              Opens are counted for information only &mdash; link previews in Discord fetch the URL before anyone clicks
              it, so they never use an invite up.
            </div>
          </div>

          {invites.length > 0 && (
            <div className="orders-status-pills invite-filters">
              {FILTERS.filter(
                // Always offer "all" and "open"; the rest only once they exist,
                // and never pull the active one out from under the selection.
                ({ key }) => key === "all" || key === "open" || counts[key] > 0 || filter === key,
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`orders-status-pill${filter === key ? " is-active" : ""}`}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <em className="invite-filter__count">{counts[key]}</em>
                </button>
              ))}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="dashboard-empty dashboard-empty--compact">
            <i className="fa-solid fa-link" aria-hidden="true" />
            <p>{filter === "all" ? "No invite links yet." : `No ${filter} invite links.`}</p>
            {filter !== "all" && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFilter("all")}>
                Show all links
              </button>
            )}
          </div>
        ) : (
          <div className="admin-orders-table-wrap">
            <table className="dashboard-table invites-table">
              <thead>
                <tr>
                  <th>For</th>
                  <th>Status</th>
                  <th>Opens</th>
                  <th>Expires</th>
                  <th>Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((invite) => (
                  <tr key={invite.id}>
                    <td>
                      <span className="invite-who">
                        <strong>{invite.note || invite.email || "Unnamed invite"}</strong>
                        {/* Only as a second line — as the heading it already
                            stood in for a missing note above. */}
                        {invite.note && invite.email && <small>{invite.email}</small>}
                        {invite.usedByName && (
                          <small className="invite-who__joined">
                            <i className="fa-solid fa-user-check" aria-hidden="true" /> Joined as {invite.usedByName}
                          </small>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`dashboard-pill ${STATE_PILL[invite.state]}`}>
                        <i className={STATE_ICON[invite.state]} aria-hidden="true" />
                        {invite.state}
                      </span>
                    </td>
                    <td>
                      <span className="invite-opens">{invite.openCount}</span>
                    </td>
                    <td>
                      <When at={invite.expiresAt} />
                    </td>
                    <td>
                      <When at={invite.createdAt} />
                    </td>
                    <td>
                      <div className="invite-actions">
                        {invite.state === "open" && (
                          <>
                            <button
                              type="button"
                              className={`btn btn--sm ${copied === invite.token ? "btn--ghost" : "btn--vivid"}`}
                              onClick={() => copyLink(invite.token)}
                            >
                              <i
                                className={copied === invite.token ? "fa-solid fa-check" : "fa-solid fa-copy"}
                                aria-hidden="true"
                              />{" "}
                              {copied === invite.token ? "Copied" : "Copy link"}
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              disabled={pending}
                              onClick={() => run(() => revokeInvite(invite.id), "Invite withdrawn.")}
                            >
                              <i className="fa-solid fa-ban" aria-hidden="true" /> Revoke
                            </button>
                          </>
                        )}
                        {invite.state !== "used" && (
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            disabled={pending}
                            aria-label="Delete invite"
                            onClick={() => run(() => deleteInvite(invite.id), "Invite deleted.")}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        )}
                        {/* Used invites have nothing left to act on — a dash
                            keeps the column from reading as a render bug. */}
                        {invite.state === "used" && <span className="invite-actions__none">&mdash;</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
