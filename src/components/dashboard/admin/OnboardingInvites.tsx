"use client";

import { useState, useTransition } from "react";
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

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function OnboardingInvites({ invites, origin }: { invites: InviteView[]; origin: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(7);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

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
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Invite a teammate</div>
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
          <div className="form-row">
            <label htmlFor="invite-days">Valid for</label>
            <input
              id="invite-days"
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
            <small className="form-row__hint">Days until the link expires.</small>
          </div>
        </div>

        <div className="teammate-profile-form__actions">
          <button
            type="button"
            className="btn btn--vivid"
            disabled={pending}
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

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Invite links</div>
            <div className="dashboard-panel__sub">
              Opens are counted for information only &mdash; link previews in Discord fetch the URL before anyone clicks
              it, so they never use an invite up.
            </div>
          </div>
        </div>

        {invites.length === 0 ? (
          <div className="dashboard-empty dashboard-empty--compact">
            <i className="fa-solid fa-link" aria-hidden="true" />
            <p>No invite links yet.</p>
          </div>
        ) : (
          <div className="admin-orders-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>For</th>
                  <th>Status</th>
                  <th>Opens</th>
                  <th>Expires</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td>
                      <strong>{invite.note || invite.email || "Unnamed invite"}</strong>
                      {invite.usedByName && <small>Joined as {invite.usedByName}</small>}
                    </td>
                    <td>
                      <span className={`dashboard-pill ${STATE_PILL[invite.state]}`}>{invite.state}</span>
                    </td>
                    <td>{invite.openCount}</td>
                    <td>{dateFormat.format(invite.expiresAt)}</td>
                    <td>{dateFormat.format(invite.createdAt)}</td>
                    <td>
                      <div className="payout-method-card__actions">
                        {invite.state === "open" && (
                          <>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => copyLink(invite.token)}>
                              <i className={copied === invite.token ? "fa-solid fa-check" : "fa-solid fa-copy"} aria-hidden="true" />{" "}
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
