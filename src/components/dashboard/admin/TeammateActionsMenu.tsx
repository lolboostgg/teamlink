"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { PriceTag } from "@/components/currency/PriceTag";
import { useToast } from "@/components/ui/ToastProvider";
import { adjustTeammateBalance } from "@/app/dashboard/admin/teammates/balanceActions";
import { setAccountBanned } from "@/app/dashboard/admin/accounts/actions";

type Action = "add" | "fine" | "ban" | "unban";

export function TeammateActionsMenu({
  teammateId,
  teammateName,
  balanceEUR,
  userId,
  banned,
}: {
  teammateId: string;
  teammateName: string;
  balanceEUR: number;
  userId: string | null;
  banned: boolean;
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
  const isMoney = action === "add" || action === "fine";

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
          await adjustTeammateBalance({ teammateId, amountEUR: parsed, direction: action, reason });
          showToast(action === "fine" ? "Balance reduced." : "Balance credited.", "success");
        } else {
          if (!userId) throw new Error("This teammate has no linked account to ban.");
          await setAccountBanned(userId, action === "ban", reason);
          showToast(
            action === "ban" ? `${teammateName} has been banned.` : `${teammateName} has been reinstated.`,
            "success",
          );
        }
        setAction(null);
        router.refresh();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "That didn't go through.", "error");
      }
    });
  }

  const canSubmit = pending
    ? false
    : isMoney
      ? parsed > 0 && Boolean(reason.trim())
      : action === "unban" || Boolean(reason.trim());

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
            <span><strong>Add money</strong><small>Bonus, goodwill, manual correction</small></span>
          </button>
          <button type="button" role="menuitem" onClick={() => open("fine")}>
            <i className="fa-solid fa-minus" aria-hidden="true" />
            <span><strong>Fine money</strong><small>Deduct for a rule breach or chargeback</small></span>
          </button>
          {userId && (banned ? (
            <button type="button" role="menuitem" onClick={() => open("unban")}>
              <i className="fa-solid fa-lock-open" aria-hidden="true" />
              <span><strong>Lift the ban</strong><small>Allow this teammate to sign in again</small></span>
            </button>
          ) : (
            <button type="button" role="menuitem" className="is-danger" onClick={() => open("ban")}>
              <i className="fa-solid fa-ban" aria-hidden="true" />
              <span><strong>Ban teammate</strong><small>Block sign-in and remove them from dispatch</small></span>
            </button>
          ))}
        </div>
      )}

      <Modal open={action !== null} onClose={() => setAction(null)} labelledBy="teammate-action-title">
        {action && (
          <div className="payout-details-modal">
            <div className="payout-method-editor__head">
              <div>
                <strong id="teammate-action-title">
                  {action === "add" && `Add money to ${teammateName}`}
                  {action === "fine" && `Fine ${teammateName}`}
                  {action === "ban" && `Ban ${teammateName}`}
                  {action === "unban" && `Lift the ban on ${teammateName}`}
                </strong>
                <span>
                  {isMoney ? (
                    <>Current balance: <PriceTag amountEUR={balanceEUR} /></>
                  ) : action === "ban" ? (
                    "They are removed from dispatch, signed out, and cannot sign back in."
                  ) : (
                    "They can sign in again, but remain unavailable until they go online."
                  )}
                </span>
              </div>
            </div>

            {isMoney && (
              <div className="form-row">
                <label htmlFor="adjust-amount">Amount (EUR)</label>
                <input id="adjust-amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </div>
            )}

            {action !== "unban" && (
              <div className="form-row">
                <label htmlFor="adjust-reason">Reason</label>
                <textarea
                  id="adjust-reason"
                  rows={2}
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    action === "ban"
                      ? "e.g. repeated no-shows — shown when they try to sign in"
                      : action === "fine"
                        ? "e.g. no-show on order #1042 — the teammate sees this"
                        : "e.g. compensation for a cancelled session — the teammate sees this"
                  }
                />
                <small className="form-row__note">
                  {action === "ban" ? "Shown on the sign-in screen." : "Shown to the teammate on their payments page."}
                </small>
              </div>
            )}

            {isMoney && parsed > 0 && (
              <div className="payout-method-notice">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>Balance goes from <PriceTag amountEUR={balanceEUR} /> to <PriceTag amountEUR={preview} />.</span>
              </div>
            )}

            <div className="teammate-profile-form__actions">
              <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => setAction(null)}>Cancel</button>
              <button
                type="button"
                className={action === "fine" || action === "ban" ? "btn btn--danger" : "btn btn--vivid"}
                disabled={!canSubmit}
                onClick={submit}
              >
                {action === "add" && `Credit €${parsed.toFixed(2)}`}
                {action === "fine" && `Deduct €${parsed.toFixed(2)}`}
                {action === "ban" && "Ban this teammate"}
                {action === "unban" && "Lift the ban"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
