import type { Metadata } from "next";
import { TeammateReviewsPanel } from "@/components/dashboard/teammate/TeammateReviewsPanel";

export const metadata: Metadata = { title: "Reviews" };

export default function TeammateReviewsPage() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Recent reviews</div>
          <div className="dashboard-panel__sub">What clients are saying</div>
        </div>
      </div>
      <TeammateReviewsPanel />
    </div>
  );
}
