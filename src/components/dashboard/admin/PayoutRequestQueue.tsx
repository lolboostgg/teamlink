"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PriceTag } from "@/components/currency/PriceTag";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { useToast } from "@/components/ui/ToastProvider";
import { markPayoutPaid, rejectPayout } from "@/app/dashboard/admin/payouts/actions";
import { PAYOUT_LABELS, type PayoutMethodType } from "@/lib/payoutMethods";
import { PAYOUT_STATUS_LABEL, payoutBreakdown, type PayoutRequestStatus } from "@/lib/payouts";

export interface AdminPayoutRow {
  id: string;
  requestNo: number;
  status: PayoutRequestStatus;
  teammateNo: number;
  teammateName: string;
  teammateAvatar: string | null;
  /** Live balance, which is what a full-balance request settles against. */
  balanceEUR: number;
  amountEUR: number | null;
  feePercent: number;
  note: string | null;
  adminNote: string | null;
  grossEUR: number | null;
  netEUR: number | null;
  methodType: PayoutMethodType;
  methodSummary: string;
  createdAt: number;
  processedAt: number | null;
}

const STATUS_PILL: Record<PayoutRequestStatus, string> = {
  PENDING: "dashboard-pill--warning",
  PAID: "dashboard-pill--success",
  REJECTED: "dashboard-pill--warning",
  CANCELLED: "dashboard-pill--muted",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function PayoutRequestQueue({ rows }: { rows: AdminPayoutRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function run(fn: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await fn();
        showToast(success, "success");
        setNoteFor(null);
        setNote("");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-sack-dollar" aria-hidden="true" />
        <p>No payout requests yet — they appear here as teammates ask to be paid.</p>
      </div>
    );
  }

  return (
    <div className="payout-request-list">
      {rows.map((row) => {
        // A full-balance request is quoted against the balance right now,
        // which is also what the server will settle against.
        const gross = row.status === "PAID" ? (row.grossEUR ?? 0) : (row.amountEUR ?? row.balanceEUR);
        const breakdown = payoutBreakdown(gross, row.feePercent);
        const shortfall = row.status === "PENDING" && row.amountEUR !== null && row.amountEUR > row.balanceEUR;

        return (
          <article className={`payout-request payout-request--admin${shortfall ? " is-alert" : ""}`} key={row.id}>
            <Link className="admin-order-person" href={`/dashboard/admin/teammates/${row.teammateNo}`}>
              <span>
                <SafeAvatarImage src={row.teammateAvatar} />
              </span>
              <strong>{row.teammateName}</strong>
            </Link>

            <div className="payout-request__main">
              <div className="payout-request__title">
                <strong>#{row.requestNo}</strong>
                <span className={`dashboard-pill ${STATUS_PILL[row.status]}`}>{PAYOUT_STATUS_LABEL[row.status]}</span>
                {row.amountEUR === null && row.status === "PENDING" && (
                  <span className="dashboard-pill dashboard-pill--muted">Full balance</span>
                )}
              </div>
              <span className="payout-request__meta">
                {PAYOUT_LABELS[row.methodType]} &middot; {row.methodSummary} &middot; {dateFormat.format(row.createdAt)}
              </span>
              {row.note && <em className="payout-request__note">&ldquo;{row.note}&rdquo;</em>}
              {row.adminNote && <em className="payout-request__note">Admin: {row.adminNote}</em>}
              {shortfall && (
                <em className="payout-request__note payout-request__note--alert">
                  Requested more than the current balance of <PriceTag amountEUR={row.balanceEUR} /> — paying will fail
                  until this is resolved.
                </em>
              )}
            </div>

            <div className="payout-request__amount">
              <strong>
                <PriceTag amountEUR={breakdown.net} />
              </strong>
              <small>
                <PriceTag amountEUR={breakdown.gross} /> − {row.feePercent}% fee
              </small>
              {row.status === "PENDING" && (
                <small>
                  Balance now: <PriceTag amountEUR={row.balanceEUR} />
                </small>
              )}
            </div>

            {row.status === "PENDING" && noteFor !== row.id && (
              <div className="payout-request__actions">
                <button
                  type="button"
                  className="btn btn--vivid btn--sm"
                  onClick={() => {
                    setNoteFor(row.id);
                    setNote("");
                  }}
                >
                  Process
                </button>
              </div>
            )}

            {/* Its own row rather than a field wedged between the amount and
                the buttons — a note that will be shown to someone deserves
                more than 200px and a placeholder. */}
            {row.status === "PENDING" && noteFor === row.id && (
              <div className="payout-process">
                <div className="form-row">
                  <label htmlFor={`payout-note-${row.id}`}>Note for the teammate (optional)</label>
                  <textarea
                    id={`payout-note-${row.id}`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Shown to them either way — a reason is worth adding when rejecting."
                  />
                </div>

                <div className="payout-process__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={pending}
                    onClick={() => {
                      setNoteFor(null);
                      setNote("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    disabled={pending}
                    onClick={() => run(() => rejectPayout(row.id, note), "Request rejected.")}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" /> Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn--vivid btn--sm"
                    disabled={pending}
                    onClick={() => run(() => markPayoutPaid(row.id, note), "Payout booked.")}
                  >
                    <i className="fa-solid fa-check" aria-hidden="true" /> Confirm paid ·{" "}
                    <PriceTag amountEUR={breakdown.net} />
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
