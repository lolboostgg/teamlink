"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { PriceTag } from "@/components/currency/PriceTag";
import { useToast } from "@/components/ui/ToastProvider";
import { requestPayout, cancelPayoutRequest } from "@/app/dashboard/teammate/payments/actions";
import { PAYOUT_LABELS, type PayoutMethodType } from "@/lib/payoutMethods";
import {
  PAYOUT_FEE_PERCENT,
  PAYOUT_STATUS_LABEL,
  payoutBreakdown,
  nextPayoutDate,
  type PayoutRequestView,
} from "@/lib/payouts";

export interface PayoutMethodOption {
  id: string;
  type: PayoutMethodType;
  summary: string;
  isDefault: boolean;
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

const STATUS_PILL: Record<string, string> = {
  PENDING: "dashboard-pill--warning",
  PAID: "dashboard-pill--success",
  REJECTED: "dashboard-pill--warning",
  CANCELLED: "dashboard-pill--muted",
};

export function PayoutRequestPanel({
  balanceEUR,
  methods,
  requests,
  verified,
}: {
  balanceEUR: number;
  methods: PayoutMethodOption[];
  requests: PayoutRequestView[];
  verified: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [methodId, setMethodId] = useState(methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [fullBalance, setFullBalance] = useState(false);
  const [note, setNote] = useState("");

  const method = methods.find((m) => m.id === methodId) ?? null;
  const feePercent = method ? PAYOUT_FEE_PERCENT[method.type] : 0;
  const requested = fullBalance ? balanceEUR : Number(amount.replace(",", ".")) || 0;
  const breakdown = useMemo(() => payoutBreakdown(requested, feePercent), [requested, feePercent]);

  const openRequest = requests.find((request) => request.status === "PENDING") ?? null;
  const payoutDate = useMemo(() => nextPayoutDate(), []);

  const blocked = !verified
    ? "Verify your identity first."
    : methods.length === 0
      ? "Add a payout method first."
      : balanceEUR <= 0
        ? "Nothing to pay out yet."
        : openRequest
          ? "You already have a request pending."
          : null;

  function submit() {
    startTransition(async () => {
      try {
        await requestPayout({ payoutMethodId: methodId, amountEUR: requested, fullBalance, note });
        showToast("Payout requested.", "success");
        setOpen(false);
        setAmount("");
        setFullBalance(false);
        setNote("");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Couldn't request that payout.", "error");
      }
    });
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Payouts</div>
          <div className="dashboard-panel__sub">
            Processed on the 1st and the 15th &middot; next run {dateFormat.format(payoutDate)}
          </div>
        </div>
        <button
          type="button"
          className="btn btn--vivid btn--sm"
          disabled={Boolean(blocked)}
          title={blocked ?? undefined}
          onClick={() => setOpen(true)}
        >
          <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Request payout
        </button>
      </div>

      {blocked && <p className="form-row__note">{blocked}</p>}

      {requests.length === 0 ? (
        <div className="dashboard-empty dashboard-empty--compact">
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          <p>No payout requests yet.</p>
        </div>
      ) : (
        <div className="payout-request-list">
          {requests.map((request) => (
            <article className="payout-request" key={request.id}>
              <div className="payout-request__main">
                <div className="payout-request__title">
                  <strong>#{request.requestNo}</strong>
                  <span className={`dashboard-pill ${STATUS_PILL[request.status]}`}>
                    {PAYOUT_STATUS_LABEL[request.status]}
                  </span>
                </div>
                <span className="payout-request__meta">
                  {PAYOUT_LABELS[request.methodType]} &middot; {request.methodSummary} &middot;{" "}
                  {dateTimeFormat.format(request.createdAt)}
                </span>
                {request.adminNote && <em className="payout-request__note">{request.adminNote}</em>}
              </div>

              <div className="payout-request__amount">
                {request.status === "PAID" && request.netEUR !== null ? (
                  <>
                    <strong>
                      <PriceTag amountEUR={request.netEUR} />
                    </strong>
                    <small>
                      after {request.feePercent}% fee on <PriceTag amountEUR={request.grossEUR ?? 0} />
                    </small>
                  </>
                ) : (
                  <>
                    <strong>
                      {request.amountEUR === null ? "Full balance" : <PriceTag amountEUR={request.amountEUR} />}
                    </strong>
                    <small>{request.feePercent}% fee applies</small>
                  </>
                )}
              </div>

              {request.status === "PENDING" && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await cancelPayoutRequest(request.id);
                        showToast("Request cancelled.", "success");
                        router.refresh();
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : "Couldn't cancel.", "error");
                      }
                    })
                  }
                >
                  Cancel
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="payout-request-title">
        <div className="payout-request-modal">
          <div className="payout-method-editor__head">
            <div>
              <strong id="payout-request-title">Request payout</strong>
              <span>Requests are settled on the 1st and the 15th of each month.</span>
            </div>
          </div>

          <div className="payout-method-notice">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <span>
              Next payout run is <strong>{dateFormat.format(payoutDate)}</strong>. Bank transfer keeps{" "}
              {PAYOUT_FEE_PERCENT.BANK}%, crypto {PAYOUT_FEE_PERCENT.CRYPTO}%.
            </span>
          </div>

          <div className="form-row-grid">
            <div className="form-row">
              <label htmlFor="payout-amount">
                Withdrawal amount <span className="payout-request__available">Available: <PriceTag amountEUR={balanceEUR} /></span>
              </label>
              <input
                id="payout-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={fullBalance ? balanceEUR.toFixed(2) : amount}
                disabled={fullBalance}
                onChange={(event) => setAmount(event.target.value)}
              />
              <label className="payout-request__full">
                <input type="checkbox" checked={fullBalance} onChange={() => setFullBalance((value) => !value)} />
                <span className="payout-request__full-box" aria-hidden="true">
                  <i className="fa-solid fa-check" />
                </span>
                <span className="payout-request__full-copy">
                  <strong>Full available amount</strong>
                  <small>
                    {fullBalance
                      ? `Whatever your balance is on ${dateFormat.format(payoutDate)} — sessions you finish before then count.`
                      : "Use your complete available payout balance."}
                  </small>
                </span>
              </label>
            </div>

            <div className="form-row">
              <label htmlFor="payout-method">Payout method</label>
              <select id="payout-method" value={methodId} onChange={(event) => setMethodId(event.target.value)}>
                {methods.map((option) => (
                  <option key={option.id} value={option.id}>
                    {PAYOUT_LABELS[option.type]}
                    {option.isDefault ? " (default)" : ""} · {option.summary}
                  </option>
                ))}
              </select>
              <Link href="/dashboard/teammate/verification" className="form-row__note">
                Manage payout methods
              </Link>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="payout-note">Note (optional)</label>
            <input
              id="payout-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything the admin should know"
            />
          </div>

          <dl className="payout-summary">
            <div>
              <dt>Requested amount</dt>
              <dd>{fullBalance ? "Full balance at payout" : <PriceTag amountEUR={breakdown.gross} />}</dd>
            </div>
            <div>
              <dt>Payout fee ({feePercent}%)</dt>
              <dd className="is-negative">
                −<PriceTag amountEUR={breakdown.fee} />
              </dd>
            </div>
            <div className="payout-summary__total">
              <dt>You receive</dt>
              <dd>
                <PriceTag amountEUR={breakdown.net} />
              </dd>
            </div>
          </dl>
          {fullBalance && (
            <p className="form-row__note">
              These figures use your balance right now; the final amount is calculated when the payout runs.
            </p>
          )}

          <div className="teammate-profile-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={pending}>
              Close
            </button>
            <button
              type="button"
              className="btn btn--vivid"
              disabled={pending || !methodId || (!fullBalance && breakdown.gross <= 0)}
              onClick={submit}
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Request payout
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
