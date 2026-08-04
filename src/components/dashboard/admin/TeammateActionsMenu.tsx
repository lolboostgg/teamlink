"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { PriceTag } from "@/components/currency/PriceTag";
import { useToast } from "@/components/ui/ToastProvider";
import { adjustTeammateBalance } from "@/app/dashboard/admin/teammates/balanceActions";

type Action = "add" | "fine";

/**
 * Balance corrections from the teammate's own page. Both directions land in
 * the earnings ledger as an ADJUSTMENT, so a balance is always explained by
 * the entries above it.
 */
export function TeammateActionsMenu({
  teammateId,
  teammateName,
  balanceEUR,
}: {
  teammateId: string;
  teammateName: string;
  balanceEUR: number;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const parsed = Number(amount.replace(",", ".")) || 0;
  const preview = action === "fine" ? Math.max(0, balanceEUR - parsed) : balanceEUR + parsed;

  function open(next: Action) {
    setAction(next);
    setAmount("");
    setReason("");
    setMenuOpen(false);
  }

  function submit() {
    if (!action) return;
    startTransition(async () => {
      try {
        await adjustTeammateBalance({ teammateId, amountEUR: parsed, direction: action, reason });
        showToast(action === "fine" ? "Balance reduced." : "Balance credited.", "success");
        setAction(null);
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Couldn't update the balance.", "error");
      }
    });
  }

  return (
    <div className="teammate-actions" ref={rootRef}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <i className="fa-solid fa-sliders" aria-hidden="true" /> Actions
        <i className="fa-solid fa-chevron-down teammate-actions__chevron" aria-hidden="true" />
      </button>

      {menuOpen && (
        <div className="teammate-actions__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => open("add")}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>
              <strong>Add money</strong>
              <small>Bonus, goodwill, manual correction</small>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => open("fine")}>
            <i className="fa-solid fa-minus" aria-hidden="true" />
            <span>
              <strong>Fine money</strong>
              <small>Deduct for a rule breach or chargeback</small>
            </span>
          </button>
        </div>
      )}

      <Modal open={action !== null} onClose={() => setAction(null)} labelledBy="teammate-action-title">
        {action && (
          <div className="payout-details-modal">
            <div className="payout-method-editor__head">
              <div>
                <strong id="teammate-action-title">{action === "fine" ? "Fine" : "Add money to"} {teammateName}</strong>
                <span>
                  Current balance: <PriceTag amountEUR={balanceEUR} />
                </span>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="adjust-amount">Amount (EUR)</label>
              <input
                id="adjust-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div className="form-row">
              <label htmlFor="adjust-reason">Reason</label>
              <textarea
                id="adjust-reason"
                rows={2}
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  action === "fine"
                    ? "e.g. no-show on order #1042 — the teammate sees this"
                    : "e.g. compensation for a cancelled session — the teammate sees this"
                }
              />
              <small className="form-row__note">Shown to the teammate on their payments page.</small>
            </div>

            {parsed > 0 && (
              <div className="payout-method-notice">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>
                  Balance goes from <PriceTag amountEUR={balanceEUR} /> to <PriceTag amountEUR={preview} />.
                </span>
              </div>
            )}

            <div className="teammate-profile-form__actions">
              <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => setAction(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={action === "fine" ? "btn btn--danger" : "btn btn--vivid"}
                disabled={pending || parsed <= 0 || !reason.trim()}
                onClick={submit}
              >
                {action === "fine" ? "Deduct" : "Credit"} €{parsed.toFixed(2)}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
