import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { dashboardHrefForRole } from "@/lib/roles";
import { DashboardAuthGate } from "@/components/dashboard/DashboardAuthGate";
import { ClientDashboardNav } from "@/components/dashboard/client/ClientDashboardNav";

// Unlike the admin/teammate dashboards (src/app/dashboard/layout.tsx), the
// client dashboard has no shell of its own — it lives inside the real
// site's Header/Footer (see (marketing)/layout.tsx) with just a tab strip
// for its own sub-pages, so it reads as part of teamlink.gg rather than a
// separate walled-off panel.
export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Signed-in but the wrong role (a teammate/admin account) — send them to
  // their own dashboard instead of showing the client one. Signed-out
  // visitors fall through to DashboardAuthGate's lock screen below.
  if (session && session.user.role !== "CLIENT") {
    redirect(dashboardHrefForRole(session.user.role));
  }

  // Nested SessionProvider carrying the already-fetched session — stops
  // the "log in to view your dashboard" flash for signed-in visitors (the
  // root SessionProvider in AppProviders has no session to start from, so
  // it fetches client-side and starts every page at status:"loading"). See
  // the longer explanation in src/app/dashboard/layout.tsx.
  return (
    <SessionProvider session={session}>
      <DashboardAuthGate>
        <div className="client-dashboard container">
          <ClientDashboardNav />
          <div className="client-dashboard__content">{children}</div>
        </div>
      </DashboardAuthGate>
    </SessionProvider>
  );
}
