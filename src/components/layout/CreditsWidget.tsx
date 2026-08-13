"use client";

import { useCallback, useState, useTransition } from "react";
import { PriceTag } from "@/components/currency/PriceTag";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/credits";
import { purchaseCredits } from "@/app/actions/credits";
import { useToast } from "@/components/ui/ToastProvider";
import { useLiveSync } from "@/lib/events/useLiveSync";
import { useHeaderDropdown } from "@/lib/useHeaderDropdown";

const BADGE_LABEL: Record<NonNullable<CreditPackage["badge"]>, string> = {
  popular: "Popular",
  best: "Best value",
};

// Header pill (balance + "+") over a panel listing top-up packages. It opens
// on hover like everything else in that row now — the argument for keeping
// this one click-only was that choosing a package is deliberate and should
// not vanish when the pointer drifts, which the shared close delay already
// handles, while being the odd one out in a row of four was its own kind of
// surprise. No real payment gateway exists in this app (see lib/payments.ts)
// — "ADD" runs a mock-confirm step then credits the real ledger, same
// honesty level as checkout's existing payment UI.
export function CreditsWidget() {
  const { open, rootRef, rootProps, triggerProps } = useHeaderDropdown();
  const [balanceCents, setBalanceCents] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/me/credits", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { balanceCents: number } | null;
      if (data) setBalanceCents(data.balanceCents);
    } catch {
      // Keep whatever is on screen; the next signal or the fallback retries.
    }
  }, []);

  // The balance used to be read once on mount and never again, so spending
  // it — a booking, a tip, a replay — or being refunded left the header
  // showing a stale figure until the next full reload. Orders are what move
  // it, and the fallback poll covers the changes that publish nothing.
  // Reads once on mount too — usePoll runs its task immediately — so there is
  // no separate mount effect here; there used to be, and it made every page
  // load ask for the balance twice.
  useLiveSync("orders", loadBalance, 20_000);

  return (
    <div className="credits-widget" ref={rootRef} {...rootProps}>
      <button type="button" className="credits-widget__pill" aria-label="Credit balance" {...triggerProps}>
        <i className="fa-solid fa-coins" aria-hidden="true" />
        <PriceTag amountEUR={(balanceCents ?? 0) / 100} />
        <span className="credits-widget__add" aria-hidden="true">
          <i className="fa-solid fa-plus" />
        </span>
      </button>

      {open && <CreditsPanel />}
    </div>
  );
}

/**
 * The package list and its confirm step.
 *
 * A separate component so that the half-finished "load €20?" state lives
 * inside the thing that unmounts when the panel closes. It used to sit on the
 * widget, which outlives the panel, so a pointer that drifted away mid-confirm
 * came back to a confirmation for a decision nobody remembered making — and
 * clearing it from an effect on `open` is the cascading-render pattern React
 * warns about. Unmounting already resets state; the fix was to put the state
 * somewhere that unmounts.
 */
function CreditsPanel() {
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState<CreditPackage | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirmPurchase() {
    if (!confirming) return;
    const pkg = confirming;
    startTransition(async () => {
      const result = await purchaseCredits(pkg.id);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      // Off to Stripe. The balance is only bumped once the webhook has the
      // money, so nothing is added optimistically here.
      window.location.assign(result.redirect);
    });
  }

  return (
    <div className="credits-widget__panel dropdown-switcher__menu dropdown-switcher__menu--right" role="menu">
      <div className="credits-widget__panel-title">Add credits to your balance</div>
      {confirming ? (
        <div className="credits-widget__confirm">
          <p>
            Load <PriceTag amountEUR={confirming.payEUR} />
            {confirming.bonusEUR > 0 && (
              <>
                {" "}
                + <PriceTag amountEUR={confirming.bonusEUR} className="credits-widget__bonus" /> bonus
              </>
            )}{" "}
            onto your balance?
          </p>
          <p className="credits-widget__confirm-note">Mock payment for this demo — no real charge.</p>
          <div className="credits-widget__confirm-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(null)} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn btn--vivid btn--sm" onClick={handleConfirmPurchase} disabled={pending}>
              {pending ? "Adding..." : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        CREDIT_PACKAGES.map((pkg) => (
          <div className="credits-widget__row" key={pkg.id}>
            <span className="credits-widget__row-amount">
              <PriceTag amountEUR={pkg.payEUR} />
              {pkg.bonusEUR > 0 && (
                <span className="credits-widget__bonus">
                  {" "}
                  +<PriceTag amountEUR={pkg.bonusEUR} />
                </span>
              )}
            </span>
            {pkg.badge && <span className={`credits-widget__badge credits-widget__badge--${pkg.badge}`}>{BADGE_LABEL[pkg.badge]}</span>}
            <button type="button" className="btn btn--vivid btn--sm" onClick={() => setConfirming(pkg)}>
              Add
            </button>
          </div>
        ))
      )}
    </div>
  );
}
