"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PriceTag } from "@/components/currency/PriceTag";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { markPayoutPaid, rejectPayout } from "@/app/dashboard/admin/payouts/actions";
import { PAYOUT_FIELDS, PAYOUT_LABELS, type PayoutMethodType } from "@/lib/payoutMethods";
import { PAYOUT_STATUS_LABEL, payoutBreakdown, type PayoutRequestStatus } from "@/lib/payouts";

export interface AdminPayoutRow {
  id: string;
  requestNo: number;
  status: PayoutRequestStatus;
  teammateNo: number;
  teammateName: string;
  /** Live balance, which is what a full-balance request settles against. */
  balanceEUR: number;
  amountEUR: number | null;
  feePercent: number;
  note: string | null;
  adminNote: string | null;
  grossEUR: number | null;
  netEUR: number | null;
  methodType: PayoutMethodType;
  /** The stored payout details, shown in full in the method dialog. */
  methodDetails: Record<string, string>;
  createdAt: number;
  processedAt: number | null;
}

const STATUS_PILL: Record<PayoutRequestStatus, string> = {
  PENDING: "dashboard-pill--warning",
  PAID: "dashboard-pill--success",
  REJECTED: "dashboard-pill--warning",
  CANCELLED: "dashboard-pill--muted",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Confirm = { row: AdminPayoutRow; action: "pay" | "reject" };

export function PayoutRequestQueue({ rows }: { rows: AdminPayoutRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [methodFor, setMethodFor] = useState<AdminPayoutRow | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [note, setNote] = useState("");

  function run(fn: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await fn();
        showToast(success, "success");
        setConfirm(null);
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
        <p>No payout requests match this filter.</p>
      </div>
    );
  }

  const confirmBreakdown = confirm
    ? payoutBreakdown(confirm.row.amountEUR ?? confirm.row.balanceEUR, confirm.row.feePercent)
    : null;

  return (
    <>
      <div className="admin-orders-table-wrap">
        <table className="dashboard-table payout-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Teammate</th>
              <th>Method</th>
              <th>Amounts</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              // A full-balance request is quoted against the balance right
              // now, which is also what the server settles against.
              const gross = row.status === "PAID" ? (row.grossEUR ?? 0) : (row.amountEUR ?? row.balanceEUR);
              const breakdown = payoutBreakdown(gross, row.feePercent);
              const shortfall = row.status === "PENDING" && row.amountEUR !== null && row.amountEUR > row.balanceEUR;

              return (
                <tr key={row.id} className={shortfall ? "is-alert" : undefined}>
                  <td className="payout-table__id">#{row.requestNo}</td>

                  <td>
                    <Link className="payout-table__user" href={`/dashboard/admin/teammates/${row.teammateNo}`}>
                      <strong>{row.teammateName}</strong>
                      <small>Teammate ID #{row.teammateNo}</small>
                    </Link>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="payout-table__method"
                      title="Show the full payout details"
                      onClick={() => setMethodFor(row)}
                    >
                      <i
                        className={row.methodType === "BANK" ? "fa-solid fa-building-columns" : "fa-brands fa-bitcoin"}
                        aria-hidden="true"
                      />
                      {PAYOUT_LABELS[row.methodType]}
                    </button>
                  </td>

                  <td>
                    <div className="payout-table__amounts">
                      <strong>
                        <PriceTag amountEUR={breakdown.net} />
                      </strong>
                      <span className="payout-chip payout-chip--fee">
                        Fee <PriceTag amountEUR={breakdown.fee} /> ({row.feePercent}%)
                      </span>
                      <span className="payout-chip payout-chip--gross">
                        {row.amountEUR === null && row.status === "PENDING" ? "Full balance " : "Original "}
                        <PriceTag amountEUR={breakdown.gross} />
                      </span>
                      {shortfall && (
                        <span className="payout-chip payout-chip--alert">
                          Balance only <PriceTag amountEUR={row.balanceEUR} />
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className={`dashboard-pill ${STATUS_PILL[row.status]}`}>
                      <i className="fa-solid fa-circle payout-table__dot" aria-hidden="true" />{" "}
                      {PAYOUT_STATUS_LABEL[row.status]}
                    </span>
                    {row.adminNote && <small className="payout-table__adminnote">{row.adminNote}</small>}
                  </td>

                  <td className="payout-table__date">{dateFormat.format(row.createdAt)}</td>

                  <td>
                    {row.status === "PENDING" ? (
                      <div className="payout-table__actions">
                        <button
                          type="button"
                          className="btn btn--sm payout-table__complete"
                          onClick={() => {
                            setConfirm({ row, action: "pay" });
                            setNote("");
                          }}
                        >
                          <i className="fa-solid fa-check" aria-hidden="true" /> Complete
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => {
                            setConfirm({ row, action: "reject" });
                            setNote("");
                          }}
                        >
                          <i className="fa-solid fa-xmark" aria-hidden="true" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="earnings-order__none">&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Full payout details. Read-only: an admin needs every field to
          actually make the transfer, but must not be able to edit where a
          teammate's money goes. */}
      <Modal open={Boolean(methodFor)} onClose={() => setMethodFor(null)} labelledBy="payout-method-details-title">
        {methodFor && (
          <div className="payout-details-modal">
            <div className="payout-method-editor__head">
              <div>
                <strong id="payout-method-details-title">Payout method details</strong>
                <span>{methodFor.teammateName}</span>
              </div>
            </div>

            <div className="form-row">
              <label>Method</label>
              <strong className="payout-details__method">{PAYOUT_LABELS[methodFor.methodType]}</strong>
            </div>

            <dl className="payout-details">
              {PAYOUT_FIELDS[methodFor.methodType]
                .filter((field) => methodFor.methodDetails[field.key])
                .map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>{methodFor.methodDetails[field.key]}</dd>
                  </div>
                ))}
            </dl>

            {methodFor.note && (
              <div className="form-row">
                <label>Teammate&rsquo;s note</label>
                <p className="payout-details__note">{methodFor.note}</p>
              </div>
            )}

            <div className="teammate-profile-form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setMethodFor(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} labelledBy="payout-confirm-title">
        {confirm && confirmBreakdown && (
          <div className="payout-details-modal">
            <div className="payout-method-editor__head">
              <div>
                <strong id="payout-confirm-title">
                  {confirm.action === "pay" ? "Confirm payout" : "Reject payout"} #{confirm.row.requestNo}
                </strong>
                <span>{confirm.row.teammateName}</span>
              </div>
            </div>

            {confirm.action === "pay" ? (
              <div className="payout-method-notice">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>
                  Books <PriceTag amountEUR={confirmBreakdown.gross} /> against their ledger and sends{" "}
                  <PriceTag amountEUR={confirmBreakdown.net} /> after the {confirm.row.feePercent}% fee. Do this once the
                  transfer has actually left.
                </span>
              </div>
            ) : (
              <div className="payout-method-notice">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>Nothing is debited — their balance stays untouched and they can request again.</span>
              </div>
            )}

            <div className="form-row">
              <label htmlFor="payout-confirm-note">Note for the teammate (optional)</label>
              <textarea
                id="payout-confirm-note"
                rows={2}
                maxLength={300}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  confirm.action === "pay" ? "Transfer reference, timing…" : "Why it was rejected — worth filling in."
                }
              />
            </div>

            <div className="teammate-profile-form__actions">
              <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              {confirm.action === "pay" ? (
                <button
                  type="button"
                  className="btn btn--vivid"
                  disabled={pending}
                  onClick={() => run(() => markPayoutPaid(confirm.row.id, note), "Payout booked.")}
                >
                  <i className="fa-solid fa-check" aria-hidden="true" /> Mark as paid
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={pending}
                  onClick={() => run(() => rejectPayout(confirm.row.id, note), "Request rejected.")}
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" /> Reject request
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
