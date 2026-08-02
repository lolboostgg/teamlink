import type { Metadata } from "next";
import { SignupsTable } from "@/components/dashboard/admin/SignupsTable";

export const metadata: Metadata = { title: "Signups" };

export default function AdminSignupsPage() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">All signups</div>
          <div className="dashboard-panel__sub">New clients and teammates</div>
        </div>
      </div>
      <SignupsTable />
    </div>
  );
}
