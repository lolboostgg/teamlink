import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { LiveOrdersPanel } from "@/components/dashboard/client/LiveOrdersPanel";
import { ClientOverviewPanels } from "@/components/dashboard/client/ClientOverviewPanels";

export const metadata: Metadata = { title: "Client Dashboard" };

export default function ClientDashboardPage() {
  return (
    <>
      <WelcomeBanner
        name="Welcome back"
        message="Here's what's happening with your bookings today."
        links={[
          { href: "/games", label: "Book a teammate", icon: "fa-solid fa-bolt" },
          { href: "/dashboard/client/orders", label: "View orders", icon: "fa-solid fa-calendar-check" },
        ]}
      />

      <LiveOrdersPanel />
      <ClientOverviewPanels />
    </>
  );
}
