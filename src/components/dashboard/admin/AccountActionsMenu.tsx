"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { PriceTag } from "@/components/currency/PriceTag";
import { useToast } from "@/components/ui/ToastProvider";
import { adjustClientCredit, setAccountBanned } from "@/app/dashboard/admin/accounts/actions";

type Action = "add" | "deduct" | "ban" | "unban";

/**
 * The corner menu on an account page — the customer-side counterpart to
 * TeammateActionsMenu, in the same place and with the same shape, because an
 * admin looking at a person should not have to learn where the controls are
 * twice.
 *
 * Both money directions write to the store-credit ledger; the ban writes to
 * the account itself. Every one of them takes a reason, and every reason is
 * shown to the person it happened to.
 */
export function AccountActionsMenu({
  userId,
  name,
  creditBalanceCents,
  banned,
  isSelf,
  isAdminAccount,
}: {
  userId: string;
  name: string;
  creditBalanceCents: number;
  banned: boolean;
  /** An admin cannot lock themselves out of the panel they are standing in. */
  isSelf: boolean;
  isAdminAccount: boolean;
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

  const balanceEUR = creditBalanceCents / 100;
  const parsed = Number(amount.replace(",", ".")) || 0;
  const preview = action === "deduct" ? Math.max(0, balanceEUR - parsed) : balanceEUR + parsed;
  const isMoney = action === "add" || action === "deduct";

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
        if (isMoney) {
          await adjustClientCredit({ userId, amountEUR: parsed, direction: action === "deduct" ? "deduct" : "add", reason });
          showToast(action === "deduct" ? "Balance reduced." : "Balance credited.", "success");
        } else {
          await setAccountBanned(userId, action === "ban", reason);
          showToast(action === "ban" ? `${name} can no longer sign in.` : `${name} can sign in again.`, "success");
        }
        setAction(null);
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "That didn't go through.", "error");
      }
    });
  }

  const canSubmit = pending ? false : isMoney ? parsed > 0 && Boolean(reason.trim()) : action === "unban" || Boolean(reason.trim());

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
              <strong>Add balance</strong>
              <small>Goodwill, compensation, manual correction</small>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => open("deduct")}>
            <i className="fa-solid fa-minus" aria-hidden="true" />
            <span>
              <strong>Deduct balance</strong>
              <small>Chargeback or a credit granted in error</small>
            </span>
          </button>

          {!isSelf && !isAdminAccount && (
            banned ? (
              <button type="button" role="menuitem" onClick={() => open("unban")}>
                <i className="fa-solid fa-lock-open" aria-hidden="true" />
                <span>
                  <strong>Lift the ban</strong>
                  <small>Let this account sign in again</small>
                </span>
              </button>
            ) : (
              <button type="button" role="menuitem" className="is-danger" onClick={() => open("ban")}>
                <i className="fa-solid fa-ban" aria-hidden="true" />
                <span>
                  <strong>Ban account</strong>
                  <small>Blocks sign-in and ends the current session</small>
                </span>
              </button>
            )
          )}
        </div>
      )}

      <Modal open={action !== null} onClose={() => setAction(null)} labelledBy="account-action-title">
        {action && (
          <div className="payout-details-modal">
            <div className="payout-method-editor__head">
              <div>
                <strong id="account-action-title">
                  {action === "add" && `Add balance to ${name}`}
                  {action === "deduct" && `Deduct balance from ${name}`}
                  {action === "ban" && `Ban ${name}`}
                  {action === "unban" && `Lift the ban on ${name}`}
                </strong>
                <span>
                  {isMoney ? (
                    <>
                      Current balance: <PriceTag amountEUR={balanceEUR} />
                    </>
                  ) : action === "ban" ? (
                    "They are signed out within seconds and cannot sign back in."
                  ) : (
                    "They can sign in again straight away."
                  )}
                </span>
              </div>
            </div>

            {isMoney && (
              <div className="form-row">
                <label htmlFor="credit-amount">Amount (EUR)</label>
                <input
                  id="credit-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            )}

            {action !== "unban" && (
              <div className="form-row">
                <label htmlFor="account-action-reason">Reason</label>
                <textarea
                  id="account-action-reason"
                  rows={2}
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    action === "ban"
                      ? "e.g. chargeback fraud across three orders — they are shown this when they try to sign in"
                      : action === "deduct"
                        ? "e.g. chargeback on order #1042 — the customer sees this"
                        : "e.g. compensation for a cancelled session — the customer sees this"
                  }
                />
                <small className="form-row__note">
                  {action === "ban" ? "Shown on the sign-in screen." : "Shown in the customer's transaction history."}
                </small>
              </div>
            )}

            {isMoney && parsed > 0 && (
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
                className={action === "deduct" || action === "ban" ? "btn btn--danger" : "btn btn--vivid"}
                disabled={!canSubmit}
                onClick={submit}
              >
                {action === "add" && `Credit €${parsed.toFixed(2)}`}
                {action === "deduct" && `Deduct €${parsed.toFixed(2)}`}
                {action === "ban" && "Ban this account"}
                {action === "unban" && "Lift the ban"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
