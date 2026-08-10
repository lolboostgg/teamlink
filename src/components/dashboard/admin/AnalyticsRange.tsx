"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const PRESETS = [
  { key: "1d", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "365d", label: "12 months" },
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const DISPLAY_DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function AnalyticsRange({ from, to, preset }: { from: string; to: string; preset: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState<"from" | "to">("from");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parseDate(from);
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  function go(next: Record<string, string | null>) {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) query.delete(key);
      else query.set(key, value);
    }
    router.push(`/dashboard/admin/analytics?${query}`);
  }

  function showPicker(field: "from" | "to") {
    const selected = parseDate(field === "from" ? customFrom : customTo);
    setActiveField(field);
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }

  function selectDate(value: string) {
    if (activeField === "from") {
      setCustomFrom(value);
      setActiveField("to");
      const selectedTo = parseDate(customTo);
      setVisibleMonth(new Date(selectedTo.getFullYear(), selectedTo.getMonth(), 1));
    } else {
      setCustomTo(value);
    }
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
          onClick={() => setOpen((value) => !value)}
        >
          <i className="fa-regular fa-calendar" aria-hidden="true" /> Custom
        </button>
      </div>

      {open && (
        <div className="range__custom">
          <div className="range__fields">
            {(["from", "to"] as const).map((field) => {
              const value = field === "from" ? customFrom : customTo;
              return (
                <label key={field}>
                  <span>{field === "from" ? "From" : "To"}</span>
                  <button
                    type="button"
                    className={`range__date-field${activeField === field ? " is-active" : ""}`}
                    onClick={() => showPicker(field)}
                  >
                    <span>{DISPLAY_DATE.format(parseDate(value))}</span>
                    <i className="fa-regular fa-calendar" aria-hidden="true" />
                  </button>
                </label>
              );
            })}
          </div>

          <div className="range-calendar">
            <div className="range-calendar__head">
              <strong>{MONTH.format(visibleMonth)}</strong>
              <span>
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                >
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                >
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </span>
            </div>
            <div className="range-calendar__grid" role="grid" aria-label={MONTH.format(visibleMonth)}>
              {WEEKDAYS.map((day) => <span className="range-calendar__weekday" key={day}>{day}</span>)}
              {days.map((date) => {
                const value = dateValue(date);
                const outside = date.getMonth() !== visibleMonth.getMonth();
                const selected = value === customFrom || value === customTo;
                const inRange = value > customFrom && value < customTo;
                const disabled = activeField === "from" ? value > customTo : value < customFrom;
                return (
                  <button
                    type="button"
                    key={value}
                    className={`${outside ? "is-outside " : ""}${selected ? "is-selected " : ""}${inRange ? "is-in-range" : ""}`}
                    disabled={disabled}
                    aria-label={DISPLAY_DATE.format(date)}
                    aria-pressed={selected}
                    onClick={() => selectDate(value)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="range__actions">
            <button type="button" className="range__cancel" onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              className="btn btn--vivid btn--sm"
              onClick={() => {
                setOpen(false);
                go({ from: customFrom, to: customTo, preset: null });
              }}
            >
              Apply range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
