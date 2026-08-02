import type { Metadata } from "next";
import { OrdersHistoryPanel } from "@/components/dashboard/client/OrdersHistoryPanel";

export const metadata: Metadata = { title: "Orders" };

export default function ClientOrdersPage() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Your orders</div>
          <div className="dashboard-panel__sub">Every booking: upcoming, completed, and cancelled</div>
        </div>
      </div>
      <OrdersHistoryPanel />
    </div>
  );
}
