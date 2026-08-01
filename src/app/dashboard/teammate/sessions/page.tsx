"use client";

import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import { useNotifications } from "@/components/dashboard/NotificationProvider";
import { UPCOMING_SESSIONS } from "@/lib/dashboard/teammateData";

export default function TeammateSessionsPage() {
  const { notifications } = useNotifications();
  const pending = notifications.filter((n) => n.status === "pending");

  return (
    <>
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Incoming requests</div>
            <div className="dashboard-panel__sub">
              Simulated realtime — new requests arrive automatically while you&rsquo;re on this dashboard
            </div>
          </div>
        </div>
        <NotificationPanel notifications={pending.length > 0 ? pending : notifications.slice(0, 3)} />
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Upcoming sessions</div>
            <div className="dashboard-panel__sub">Confirmed and scheduled</div>
          </div>
        </div>
        <SessionsList sessions={UPCOMING_SESSIONS} />
      </div>
    </>
  );
}
