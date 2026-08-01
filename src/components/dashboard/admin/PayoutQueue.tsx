"use client";

import { useState } from "react";
import { PriceTag } from "@/components/currency/PriceTag";
import type { PayoutRequest, TicketRow } from "@/lib/dashboard/adminData";

const PAYOUT_PILL: Record<PayoutRequest["status"], string> = {
  pending: "dashboard-pill--warning",
  approved: "dashboard-pill--success",
  paid: "dashboard-pill--muted",
};

const TICKET_PILL: Record<TicketRow["status"], string> = {
  open: "dashboard-pill--warning",
  pending: "dashboard-pill--muted",
  resolved: "dashboard-pill--success",
};

// "Approve" is a no-op — this is a mock-data dashboard, there's no backend
// to actually process a payout against.
export function PayoutQueue({ payouts, tickets }: { payouts: PayoutRequest[]; tickets: TicketRow[] }) {
  const [approved, setApproved] = useState<Set<string>>(new Set());

  return (
    <>
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Teammate</th>
            <th>Amount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => {
            const isApproved = approved.has(p.id);
            const status = isApproved && p.status === "pending" ? "approved" : p.status;
            return (
              <tr key={p.id}>
                <td className="dashboard-table__primary">{p.teammate}</td>
                <td>
                  <PriceTag amountEUR={p.amountEUR} />
                </td>
                <td>
                  <span className={`dashboard-pill ${PAYOUT_PILL[status]}`}>{status}</span>
                </td>
                <td>
                  {p.status === "pending" && !isApproved && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setApproved((prev) => new Set(prev).add(p.id))}
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="dashboard-panel__sub" style={{ margin: "22px 0 12px" }}>
        Open disputes & support tickets
      </div>
      <div className="dashboard-list">
        {tickets.map((t) => (
          <div className="dashboard-list-item" key={t.id}>
            <div className="dashboard-list-item__meta">
              <div className="dashboard-list-item__title">{t.subject}</div>
              <div className="dashboard-list-item__sub">{t.user} · {t.priority} priority</div>
            </div>
            <span className={`dashboard-pill ${TICKET_PILL[t.status]}`}>{t.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}
