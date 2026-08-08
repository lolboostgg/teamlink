"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { PriceTag } from "@/components/currency/PriceTag";
import { adminCancelOrder, adminCompleteOrder, type CancelMode } from "@/app/dashboard/admin/orders/actions";

interface Props {
  orderId: string;
  priceEUR: number;
  played: number;
  booked: number;
  /** Already COMPLETED, CANCELLED or NO_MATCH — nothing left to steer. */
  settled: boolean;
  /** Shown in the settled state, so the bar says what it ended as. */
  statusLabel: string;
}

const MODES: { key: CancelMode; label: string; hint: string }[] = [
  { key: "proportional", label: "Per game", hint: "Only the games they didn't get" },
  { key: "full", label: "Everything", hint: "The whole order value back" },
  { key: "custom", label: "Custom", hint: "An exact figure you decide" },
  { key: "none", label: "Nothing", hint: "Cancel without returning money" },
];

/**
 * The manual overrides for one order: end it with a refund of your choosing,
 * or close it out as done.
 *
 * Both exist for the same reason — the ordinary flow needs a teammate to
 * drive it, and the cases that reach an admin are the ones where that did not
 * happen. A teammate who lost access, a session finished in Discord, a
 * complaint settled at a number nobody's arithmetic would have produced.
 */
export function AdminOrderControls({ orderId, priceEUR, played, booked, settled, statusLabel }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<CancelMode>("proportional");
  const [custom, setCustom] = useState<number>(priceEUR);
  const [confirming, setConfirming] = useState<null | "cancel" | "complete">(null);
  const [pending, startTransition] = useTransition();

  const unplayed = Math.max(0, booked - Math.min(played, booked));
  const proportional = booked > 0 ? (priceEUR * unplayed) / booked : priceEUR;
  const customValid = Number.isFinite(custom) && custom >= 0 && custom <= priceEUR;

  const amount = mode === "proportional" ? proportional : mode === "full" ? priceEUR : mode === "custom" ? custom : 0;

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setConfirming(null);
      if (result.ok) showToast(result.message ?? "Done.", "success");
      else showToast(result.error ?? "Something went wrong.", "error");
      router.refresh();
    });
  }

  // A full panel with a head, a subtitle and no controls under it was most
  // of a screen's height saying "nothing to do here". One line does that.
  if (settled) {
    return (
      <p className="admin-order-settled">
        <i className="fa-solid fa-lock" aria-hidden="true" />
        <span>
          This order is <strong>{statusLabel}</strong> — settled, so there is nothing left to cancel or close.
        </span>
      </p>
    );
  }

  return (
    <section className="dashboard-panel admin-order-controls">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">
            <i className="fa-solid fa-sliders" aria-hidden="true" /> Manual controls
          </div>
          <div className="dashboard-panel__sub">
            {played} of {booked} games played. Whether the money goes back as credit or to the card follows the
            customer — an account is credited, a guest is refunded.
          </div>
        </div>
      </div>

      <div className="admin-order-controls__modes" role="group" aria-label="How much to refund">
        {MODES.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`admin-order-controls__mode${mode === option.key ? " is-active" : ""}`}
            aria-pressed={mode === option.key}
            onClick={() => setMode(option.key)}
          >
            <strong>{option.label}</strong>
            <small>{option.hint}</small>
          </button>
        ))}
      </div>

      {mode === "custom" && (
        <div className="form-row admin-order-controls__custom">
          <label htmlFor="admin-refund-amount">Refund amount (EUR)</label>
          <input
            id="admin-refund-amount"
            type="number"
            min={0}
            max={priceEUR}
            step="0.01"
            value={Number.isNaN(custom) ? "" : custom}
            onChange={(event) => setCustom(event.target.valueAsNumber)}
          />
          <small className="form-row__note">
            At most the order value, <PriceTag amountEUR={priceEUR} />. More than was paid cannot be given back.
          </small>
        </div>
      )}

      <div className="admin-order-controls__summary">
        <span>Customer gets back</span>
        <strong>
          <PriceTag amountEUR={mode === "custom" && !customValid ? 0 : amount} />
        </strong>
      </div>

      <div className="admin-order-controls__actions">
        <button
          type="button"
          className="btn btn--danger"
          disabled={pending || (mode === "custom" && !customValid)}
          onClick={() => setConfirming("cancel")}
        >
          <i className="fa-solid fa-ban" aria-hidden="true" /> Cancel order
        </button>
        <button type="button" className="btn btn--vivid" disabled={pending} onClick={() => setConfirming("complete")}>
          <i className="fa-solid fa-flag-checkered" aria-hidden="true" /> Mark completed
        </button>
      </div>

      {/* Both of these move money and neither can be undone from here, so
          they ask once and say exactly what will happen. */}
      {confirming && (
        <div className="admin-order-controls__confirm">
          <p>
            {confirming === "cancel" ? (
              <>
                Cancel order and return <PriceTag amountEUR={amount} /> to the customer?
                {played > 0 && " The teammate is still paid for the games they played."}
              </>
            ) : (
              <>Close this order as completed? The teammate is paid their full share for it.</>
            )}
          </p>
          <div className="admin-order-controls__confirm-actions">
            <button type="button" className="btn btn--ghost btn--sm" disabled={pending} onClick={() => setConfirming(null)}>
              Back
            </button>
            <button
              type="button"
              className={`btn btn--sm ${confirming === "cancel" ? "btn--danger" : "btn--vivid"}`}
              disabled={pending}
              onClick={() =>
                run(() =>
                  confirming === "cancel"
                    ? adminCancelOrder(orderId, mode, custom)
                    : adminCompleteOrder(orderId),
                )
              }
            >
              {pending ? "Working…" : "Yes, do it"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
