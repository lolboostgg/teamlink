import type { Metadata } from "next";
import { BookingsTable } from "@/components/dashboard/client/BookingsTable";
import { CLIENT_BOOKINGS } from "@/lib/dashboard/clientData";

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
      <BookingsTable bookings={CLIENT_BOOKINGS} />
    </div>
  );
}
