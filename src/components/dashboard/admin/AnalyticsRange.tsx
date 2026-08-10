"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * The window everything on the analytics page is measured over.
 *
 * Presets first, because "last 7 days" is what somebody wants nine times out
 * of ten and a date picker makes them do arithmetic to get it. The two date
 * fields are there for the tenth time, and they write the same two query
 * params the presets do — so a custom range is bookmarkable and a preset is
 * just a range somebody did not have to type.
 */

const PRESETS = [
  { key: "1d", label: "Today", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "365d", label: "12 months", days: 365 },
];

export function AnalyticsRange({ from, to, preset }: { from: string; to: string; preset: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [open, setOpen] = useState(false);

  function go(next: Record<string, string | null>) {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) query.delete(key);
      else query.set(key, value);
    }
    router.push(`/dashboard/admin/analytics?${query}`);
  }

  return (
    <div className="range">
      <div className="range__presets" role="group" aria-label="Reporting period">
        {PRESETS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`range__preset${preset === option.key ? " is-active" : ""}`}
            aria-pressed={preset === option.key}
            onClick={() => go({ preset: option.key, from: null, to: null })}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          className={`range__preset${preset === null ? " is-active" : ""}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <i className="fa-regular fa-calendar" aria-hidden="true" /> Custom
        </button>
      </div>

      {open && (
        <div className="range__custom">
          <label>
            <span>From</span>
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn--vivid btn--sm"
            onClick={() => {
              setOpen(false);
              go({ from: customFrom, to: customTo, preset: null });
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
