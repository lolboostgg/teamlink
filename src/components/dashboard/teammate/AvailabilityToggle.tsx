"use client";

import { isAvailable, setAvailable, useIsAvailable } from "@/lib/availability";

export function AvailabilityToggle() {
  const available = useIsAvailable();

  return (
    <div className="dashboard-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div className="dashboard-panel__title">Availability</div>
        <div className="dashboard-panel__sub">
          {available ? "You're visible to clients right now." : "You're hidden from matchmaking."}
        </div>
      </div>
      <button
        type="button"
        className="btn btn--sm"
        style={{
          background: available ? "var(--hue-green)" : "rgba(255,255,255,0.08)",
          color: available ? "#06080f" : "var(--text)",
        }}
        onClick={() => setAvailable(!isAvailable())}
        aria-pressed={available}
      >
        <i className={`fa-solid ${available ? "fa-toggle-on" : "fa-toggle-off"}`} aria-hidden="true" />
        {available ? "Available" : "Unavailable"}
      </button>
    </div>
  );
}
