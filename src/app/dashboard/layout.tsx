import { ViewTransition } from "react";
import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { DashboardAuthGate } from "@/components/dashboard/DashboardAuthGate";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";
import { DispatchFlow } from "@/components/dashboard/teammate/DispatchFlow";

// Sibling of the (marketing) route group, so /dashboard/* gets its own
// shell (sidebar + topbar) instead of inheriting the marketing Header/
// Footer. The ViewTransition here mirrors the one in (marketing)/layout.tsx
// via matching transition types (dashboard-enter/dashboard-exit) so the two
// sides animate as one continuous motion instead of two independent swaps.
// In-dashboard navigation (sidebar links, role switch) carries no
// transition type, so it hits default:"none" — a quiet instant update.
// DashboardAuthGate wraps the *entire* shell (not just the content area) —
// when logged out you see only the lock screen, no half-rendered sidebar.
//
// initiallyAuthenticated (from the server-fetched session here) is what
// stops the "log in to view your dashboard" flash on every load for people
// who ARE logged in — without it, the root SessionProvider starts every
// page at status:"loading" and fetches the session client-side from
// scratch, so client components briefly render the signed-out UI before
// that resolves. See DashboardAuthGate for why this is a plain prop and
// not a second nested SessionProvider (that broke the header instead).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <DashboardAuthGate initiallyAuthenticated={!!session}>
      <NotificationProvider>
        <DispatchFlow />
        <div className="dashboard-shell">
          <DashboardSidebar />
          <div className="dashboard-shell__main">
            <DashboardTopbar />
            <ViewTransition
              enter={{ "dashboard-enter": "dash-in-fwd", default: "none" }}
              exit={{ "dashboard-exit": "dash-out-back", default: "none" }}
              default="none"
            >
              <main className="dashboard-content">{children}</main>
            </ViewTransition>
          </div>
        </div>
      </NotificationProvider>
    </DashboardAuthGate>
  );
}
