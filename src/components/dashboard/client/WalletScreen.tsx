"use client";

import { useState, useTransition } from "react";
import { PriceTag } from "@/components/currency/PriceTag";
import { CREDIT_PACKAGES } from "@/lib/credits";
import { purchaseCredits } from "@/app/actions/credits";
import { useToast } from "@/components/ui/ToastProvider";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";

type TransactionFilter = "all" | "in" | "out";
const PAGE_SIZE = 7;

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
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const filtered = transactions.filter((transaction) => filter === "all" || (filter === "in" ? transaction.amountCents >= 0 : transaction.amountCents < 0));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleTransactions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Buying credit is a real payment now, so this leaves for Stripe's hosted
  // page. The balance appears when the webhook confirms it — landing back
  // here is not, by itself, proof that anything was paid.
  function buy(packageId: string) {
    startTransition(async () => {
      const result = await purchaseCredits(packageId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.location.assign(result.redirect);
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
          <div className="wallet-filter-pills" role="group" aria-label="Filter transactions">
            {([ ["all", "All", "fa-solid fa-list-ul"], ["in", "Money in", "fa-solid fa-circle-plus"], ["out", "Money out", "fa-solid fa-circle-minus"] ] as const).map(([value, label, icon]) => (
              <button key={value} type="button" className={`wallet-filter-pill wallet-filter-pill--${value}${filter === value ? " is-active" : ""}`} onClick={() => { setFilter(value); setPage(1); }}><i className={icon} aria-hidden="true" />{label}<span>{value === "all" ? transactions.length : transactions.filter((item) => value === "in" ? item.amountCents >= 0 : item.amountCents < 0).length}</span></button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-receipt" aria-hidden="true" />
            <p>No transactions yet — your history will appear here.</p>
          </div>
        ) : (
          <div className="dashboard-list">
            {visibleTransactions.map((t) => {
              const meta = TYPE_META[t.type] ?? { label: t.type, icon: "fa-solid fa-circle", positive: true };
              const positive = t.amountCents >= 0;
              return (
                <div className={`dashboard-list-item wallet-tx wallet-tx--${positive ? "in" : "out"}`} key={t.id}>
                  <span className={`wallet-tx__icon ${positive ? "is-in" : "is-out"}`}>
                    <i className={meta.icon} aria-hidden="true" />
                  </span>
                  <div className="dashboard-list-item__meta">
                    <div className="dashboard-list-item__title">{meta.label}</div>
                    <div className="dashboard-list-item__sub">
                      {t.note ?? "—"} · {formatOrderDate(t.createdAt)}
                    </div>
                  </div>
                  <div className={`wallet-tx__amount ${positive ? "is-in" : "is-out"}`}>
                    {positive ? "+" : "−"}
                    <PriceTag amountEUR={Math.abs(t.amountCents) / 100} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filtered.length > PAGE_SIZE && (
          <nav className="orders-pagination wallet-pagination" aria-label="Transaction pagination">
            <span>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} transactions</span>
            <div className="orders-pagination__buttons"><button type="button" className="btn btn--ghost btn--sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><i className="fa-solid fa-chevron-left" /> Previous</button><span className="orders-pagination__page">Page {currentPage} of {pageCount}</span><button type="button" className="btn btn--ghost btn--sm" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next <i className="fa-solid fa-chevron-right" /></button></div>
          </nav>
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
