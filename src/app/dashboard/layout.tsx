import { ViewTransition } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { DashboardAuthGate } from "@/components/dashboard/DashboardAuthGate";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";

// Sibling of the (marketing) route group, so /dashboard/* gets its own
// shell (sidebar + topbar) instead of inheriting the marketing Header/
// Footer. The ViewTransition here mirrors the one in (marketing)/layout.tsx
// via matching transition types (dashboard-enter/dashboard-exit) so the two
// sides animate as one continuous motion instead of two independent swaps.
// In-dashboard navigation (sidebar links, role switch) carries no
// transition type, so it hits default:"none" — a quiet instant update.
// DashboardAuthGate wraps the *entire* shell (not just the content area) —
// when logged out you see only the lock screen, no half-rendered sidebar.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGate>
      <NotificationProvider>
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
