import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { AvailabilityToggle } from "@/components/dashboard/teammate/AvailabilityToggle";
import { ActiveOrderCard } from "@/components/dashboard/teammate/ActiveOrderCard";
import { PendingInvitesBanner } from "@/components/dashboard/teammate/PendingInvitesBanner";
import { TeammateOverviewPanels } from "@/components/dashboard/teammate/TeammateOverviewPanels";

export const metadata: Metadata = { title: "Teammate Dashboard" };

export default function TeammateDashboardPage() {
  return (
    <>
      <WelcomeBanner
        name="Welcome back, Nova"
        message="Stay online to keep receiving booking requests."
        links={[
          { href: "/dashboard/teammate/sessions", label: "Sessions", icon: "fa-solid fa-calendar-check" },
          { href: "/dashboard/teammate/chat", label: "Chat", icon: "fa-solid fa-comments" },
        ]}
      />

      <PendingInvitesBanner />
      <TeammateOverviewPanels />
      <AvailabilityToggle />
      <ActiveOrderCard />
    </>
  );
}
