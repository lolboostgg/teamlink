import { ViewTransition } from "react";
import { SiteTopbar } from "@/components/layout/SiteTopbar";
import { Footer } from "@/components/layout/Footer";
import { RouteTracker } from "@/components/layout/RouteTracker";

// Marketing chrome (Header/Footer) lives here instead of the root layout so
// /dashboard/* gets its own shell. The ViewTransition below is the "flying
// into the dashboard" effect: links tagged transitionTypes={['dashboard-enter']}
// (see DashboardTrigger) slide this content out; the mirrored enter
// animation on the dashboard-side ViewTransition (dashboard/layout.tsx)
// slides its content in. Header/Footer sit outside the transition and simply
// unmount/remount — the dashboard has its own topbar, so there's nothing to
// visually anchor between the two shells.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <RouteTracker />
      <SiteTopbar />
      <ViewTransition
        enter={{ "dashboard-exit": "dash-in-back", default: "none" }}
        exit={{ "dashboard-enter": "dash-out-fwd", default: "none" }}
        default="none"
      >
        {children}
      </ViewTransition>
      <Footer />
    </div>
  );
}
