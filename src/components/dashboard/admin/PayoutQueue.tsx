"use client";

import { useState } from "react";
import { PriceTag } from "@/components/currency/PriceTag";
import type { PayoutRow } from "@/lib/dashboard/adminMetrics";

// "Approve" is a local-only toggle — this is a mock-data dashboard, there's
// no backend to actually process a payout against. The amounts themselves
// are real though, computed from completed orders in lib/dashboard/adminMetrics.ts.
export function PayoutQueue({ payouts }: { payouts: PayoutRow[] }) {
  const [approved, setApproved] = useState<Set<string>>(new Set());

  return (
    <>
      {payouts.length === 0 ? (
        <div className="dashboard-empty">
          <i className="fa-solid fa-sack-dollar" aria-hidden="true" />
          <p>No completed sessions yet — payouts appear here once a session finishes.</p>
        </div>
      ) : (
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Teammate</th>
              <th>Sessions</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => {
              const isApproved = approved.has(p.teammateId);
              return (
                <tr key={p.teammateId}>
                  <td className="dashboard-table__primary">{p.teammateName}</td>
                  <td>{p.sessionsCount}</td>
                  <td>
                    <PriceTag amountEUR={p.amountEUR} />
                  </td>
                  <td>
                    <span className={`dashboard-pill ${isApproved ? "dashboard-pill--success" : "dashboard-pill--warning"}`}>
                      {isApproved ? "approved" : "pending"}
                    </span>
                  </td>
                  <td>
                    {!isApproved && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setApproved((prev) => new Set(prev).add(p.teammateId))}
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
      )}

      <div className="dashboard-panel__sub" style={{ margin: "22px 0 12px" }}>
        Open disputes & support tickets
      </div>
      <div className="dashboard-empty">
        <i className="fa-solid fa-headset" aria-hidden="true" />
        <p>No support ticket system in this demo — Need Help just shows a confirmation toast, it doesn&rsquo;t file a ticket.</p>
      </div>
    </>
  );
}
