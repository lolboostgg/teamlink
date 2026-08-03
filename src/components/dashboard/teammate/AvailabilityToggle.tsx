"use client";

import { useState, useTransition } from "react";
import { setOnlineAction } from "@/app/dashboard/teammate/dispatchActions";
import { useToast } from "@/components/ui/ToastProvider";

// Online state lives on Teammate.available in the database — the dispatcher
// reads it server-side when deciding who to invite, so a browser-local flag
// (the old lib/availability.ts) had no bearing on who actually got an order.
export function AvailabilityToggle({ initialOnline }: { initialOnline: boolean }) {
  const { showToast } = useToast();
  const [online, setOnline] = useState(initialOnline);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !online;
    startTransition(async () => {
      const result = await setOnlineAction(next);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setOnline(next);
      showToast(next ? "You're online — requests can reach you." : "You're offline.", "info");
    });
  }

  return (
    <div className={`online-toggle${online ? " is-online" : ""}`}>
      <div>
        <div className="online-toggle__title">
          <span className="online-toggle__dot" aria-hidden="true" />
          {online ? "Online — ready for new orders" : "You're currently offline"}
        </div>
        <div className="dashboard-panel__sub">
          {online
            ? "You can receive matchmaking requests right now."
            : "Go online to start receiving matchmaking requests."}
        </div>
      </div>
      <button
        type="button"
        className={`btn ${online ? "btn--ghost" : "btn--vivid"}`}
        onClick={toggle}
        disabled={pending}
        aria-pressed={online}
      >
        {pending ? "…" : online ? "Go offline" : "Go online"}
      </button>
    </div>
  );
}
