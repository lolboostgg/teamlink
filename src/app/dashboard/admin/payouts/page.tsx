import type { Metadata } from "next";
import { AdminPayoutQueuePanel } from "@/components/dashboard/admin/AdminPayoutQueuePanel";

export const metadata: Metadata = { title: "Payouts & Disputes" };

export default function AdminPayoutsPage() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Payouts & disputes</div>
          <div className="dashboard-panel__sub">What teammates have earned from completed sessions</div>
        </div>
      </div>
      <AdminPayoutQueuePanel />
    </div>
  );
}
