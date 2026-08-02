import { DashboardAuthGate } from "@/components/dashboard/DashboardAuthGate";
import { ClientDashboardNav } from "@/components/dashboard/client/ClientDashboardNav";

// Unlike the admin/teammate dashboards (src/app/dashboard/layout.tsx), the
// client dashboard has no shell of its own — it lives inside the real
// site's Header/Footer (see (marketing)/layout.tsx) with just a tab strip
// for its own sub-pages, so it reads as part of teamlink.gg rather than a
// separate walled-off panel.
export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGate>
      <div className="client-dashboard container">
        <ClientDashboardNav />
        <div className="client-dashboard__content">{children}</div>
      </div>
    </DashboardAuthGate>
  );
}
