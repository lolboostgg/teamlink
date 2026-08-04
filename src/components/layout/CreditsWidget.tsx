"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PriceTag } from "@/components/currency/PriceTag";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/credits";
import { purchaseCredits } from "@/app/actions/credits";
import { useToast } from "@/components/ui/ToastProvider";

const BADGE_LABEL: Record<NonNullable<CreditPackage["badge"]>, string> = {
  popular: "Popular",
  best: "Best value",
};

// Header pill (balance + "+") with a click-open panel listing top-up
// packages — click-toggle rather than DashboardTrigger's hover pattern,
// since choosing a package is a deliberate multi-step action you want to
// stay open while you read it, not something that should vanish the
// instant the pointer drifts. No real payment gateway exists in this app
// (see lib/payments.ts) — "ADD" runs a mock-confirm step then credits the
// real ledger, same honesty level as checkout's existing payment UI.
export function CreditsWidget() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<CreditPackage | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { balanceCents: number } | null) => {
        if (!cancelled && data) setBalanceCents(data.balanceCents);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

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
    <div className="credits-widget" ref={rootRef}>
      <button
        type="button"
        className="credits-widget__pill"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <i className="fa-solid fa-coins" aria-hidden="true" />
        <PriceTag amountEUR={(balanceCents ?? 0) / 100} />
        <span className="credits-widget__add" aria-hidden="true">
          <i className="fa-solid fa-plus" />
        </span>
      </button>

      {open && (
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
      )}
    </div>
  );
}
