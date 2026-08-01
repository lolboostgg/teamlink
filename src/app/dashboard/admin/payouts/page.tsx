import type { Metadata } from "next";
import { PayoutQueue } from "@/components/dashboard/admin/PayoutQueue";
import { PAYOUT_QUEUE, SUPPORT_TICKETS } from "@/lib/dashboard/adminData";

export const metadata: Metadata = { title: "Payouts & Disputes" };

export default function AdminPayoutsPage() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Payouts & disputes</div>
          <div className="dashboard-panel__sub">Teammate payout requests waiting on review</div>
        </div>
      </div>
      <PayoutQueue payouts={PAYOUT_QUEUE} tickets={SUPPORT_TICKETS} />
    </div>
  );
}
