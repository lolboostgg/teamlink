"use client";

import { SessionsList } from "@/components/dashboard/teammate/SessionsList";
import { IncomingDispatchList } from "@/components/dashboard/teammate/IncomingDispatchList";
import { ActiveOrderCard } from "@/components/dashboard/teammate/ActiveOrderCard";
import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { CURRENT_TEAMMATE_ID } from "@/lib/matchmaking/store";

export default function TeammateSessionsPage() {
  const orders = useAllOrders().filter(
    (o) => o.selectedTeammateIds.includes(CURRENT_TEAMMATE_ID) && o.status !== "cancelled"
  );
  const upcoming = orders.filter((o) => o.status === "assigned" || o.status === "in_progress");
  const completed = orders.filter((o) => o.status === "completed");

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
        {upcoming.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
            <p>No upcoming sessions yet.</p>
          </div>
        ) : (
          <SessionsList orders={upcoming} />
        )}
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Completed sessions</div>
            <div className="dashboard-panel__sub">Your session history</div>
          </div>
        </div>
        {completed.length === 0 ? (
          <div className="dashboard-empty">
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
            <p>No completed sessions yet.</p>
          </div>
        ) : (
          <SessionsList orders={completed} />
        )}
      </div>
    </>
  );
}
