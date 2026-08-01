"use client";

import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import { IncomingDispatchList } from "@/components/dashboard/teammate/IncomingDispatchList";
import { ActiveOrderCard } from "@/components/dashboard/teammate/ActiveOrderCard";
import { UPCOMING_SESSIONS } from "@/lib/dashboard/teammateData";

export default function TeammateSessionsPage() {
  return (
    <>
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Incoming requests</div>
            <div className="dashboard-panel__sub">
              Live dispatch, a real customer order lands here the moment it&rsquo;s sent to you
            </div>
          </div>
        </div>
        <IncomingDispatchList />
      </div>

      <ActiveOrderCard />

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
