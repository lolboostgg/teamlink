"use client";

import { useState, useTransition } from "react";
import { PriceTag } from "@/components/currency/PriceTag";
import { CREDIT_PACKAGES } from "@/lib/credits";
import { purchaseCredits } from "@/app/actions/credits";
import { useToast } from "@/components/ui/ToastProvider";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";

export interface WalletTransaction {
  id: string;
  type: string;
  amountCents: number;
  note: string | null;
  createdAt: number;
}

const TYPE_META: Record<string, { label: string; icon: string; positive: boolean }> = {
  TOPUP: { label: "Top-up", icon: "fa-solid fa-arrow-down", positive: true },
  BONUS: { label: "Bonus", icon: "fa-solid fa-gift", positive: true },
  REFUND: { label: "Refund", icon: "fa-solid fa-rotate-left", positive: true },
  ADMIN_ADJUST: { label: "Adjustment", icon: "fa-solid fa-sliders", positive: true },
  SPEND: { label: "Spent", icon: "fa-solid fa-arrow-up", positive: false },
};

export function WalletScreen({
  balanceCents,
  bonusCents,
  transactions,
}: {
  balanceCents: number;
  bonusCents: number;
  transactions: WalletTransaction[];
}) {
  const { showToast } = useToast();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function buy(packageId: string) {
    startTransition(async () => {
      try {
        await purchaseCredits(packageId);
        setTopUpOpen(false);
        showToast("Balance added.", "success");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Couldn't add balance.", "error");
      }
    });
  }

  return (
    <>
      <div className="wallet-head">
        <div className="wallet-balance">
          <span className="wallet-balance__icon wallet-balance__icon--main">
            <i className="fa-solid fa-wallet" aria-hidden="true" />
          </span>
          <div>
            <div className="wallet-balance__value">
              <PriceTag amountEUR={balanceCents / 100} />
            </div>
            <div className="wallet-balance__label">Wallet balance</div>
          </div>
        </div>

        <div className="wallet-balance">
          <span className="wallet-balance__icon wallet-balance__icon--bonus">
            <i className="fa-solid fa-gift" aria-hidden="true" />
          </span>
          <div>
            <div className="wallet-balance__value">
              <PriceTag amountEUR={bonusCents / 100} />
            </div>
            <div className="wallet-balance__label">Bonus received</div>
          </div>
        </div>

        <button type="button" className="btn btn--vivid wallet-head__cta" onClick={() => setTopUpOpen(true)}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Add balance
        </button>
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Transactions</div>
            <div className="dashboard-panel__sub">Every change to your store credit</div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-receipt" aria-hidden="true" />
            <p>No transactions yet — your history will appear here.</p>
          </div>
        ) : (
          <div className="dashboard-list">
            {transactions.map((t) => {
              const meta = TYPE_META[t.type] ?? { label: t.type, icon: "fa-solid fa-circle", positive: true };
              return (
                <div className="dashboard-list-item" key={t.id}>
                  <span className={`wallet-tx__icon${meta.positive ? " is-in" : " is-out"}`}>
                    <i className={meta.icon} aria-hidden="true" />
                  </span>
                  <div className="dashboard-list-item__meta">
                    <div className="dashboard-list-item__title">{meta.label}</div>
                    <div className="dashboard-list-item__sub">
                      {t.note ?? "—"} · {formatOrderDate(t.createdAt)}
                    </div>
                  </div>
                  <div className={`wallet-tx__amount${meta.positive ? " is-in" : " is-out"}`}>
                    {meta.positive ? "+" : "−"}
                    <PriceTag amountEUR={Math.abs(t.amountCents) / 100} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {topUpOpen && (
        <div className="dispatch-modal__backdrop" role="dialog" aria-modal="true">
          <div className="dispatch-modal">
            <div className="dispatch-modal__head">
              <div>
                <div className="dispatch-modal__eyebrow">Store credit</div>
                <h2 className="dispatch-modal__title">Add balance</h2>
              </div>
            </div>

            <div className="wallet-packages">
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  className="wallet-package"
                  disabled={pending}
                  onClick={() => buy(pkg.id)}
                >
                  <strong>
                    <PriceTag amountEUR={pkg.payEUR} />
                  </strong>
                  {pkg.bonusEUR > 0 && (
                    <span className="wallet-package__bonus">
                      +<PriceTag amountEUR={pkg.bonusEUR} /> bonus
                    </span>
                  )}
                  {pkg.badge && <span className={`wallet-package__badge is-${pkg.badge}`}>{pkg.badge}</span>}
                </button>
              ))}
            </div>

            <p className="dispatch-modal__note">
              No payment provider is connected yet — confirming a package credits the ledger directly, same as the
              rest of checkout.
            </p>

            <div className="dispatch-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setTopUpOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
