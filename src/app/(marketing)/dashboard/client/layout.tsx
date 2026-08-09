import { auth } from "@/auth";
import { DashboardAuthGate } from "@/components/dashboard/DashboardAuthGate";
import { ClientDashboardNav } from "@/components/dashboard/client/ClientDashboardNav";
import { ClientDashboardContent } from "@/components/dashboard/client/ClientDashboardContent";

// Unlike the admin/teammate dashboards (src/app/dashboard/layout.tsx), the
// client dashboard has no shell of its own — it lives inside the real
// site's Header/Footer (see (marketing)/layout.tsx) with just a tab strip
// for its own sub-pages, so it reads as part of qup.gg rather than a
// separate walled-off panel.
export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // No role check any more: every signed-in account may open this one. A
  // teammate books duos of their own and an admin has to be able to see the
  // product they run — both used to be bounced straight back out, which meant
  // their own orders were unreachable from the account that placed them.
  // Signed-out visitors fall through to DashboardAuthGate's lock screen below.

  // initiallyAuthenticated stops the "log in to view your dashboard" flash
  // for signed-in visitors without a second nested SessionProvider — see
  // the longer explanation in DashboardAuthGate/src/app/dashboard/layout.tsx.
  return (
    <DashboardAuthGate initiallyAuthenticated={!!session}>
      <div className="client-dashboard container">
        <ClientDashboardNav />
        <ClientDashboardContent>{children}</ClientDashboardContent>
      </div>
    </DashboardAuthGate>
  );
}
