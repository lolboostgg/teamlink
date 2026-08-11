"use client";

import { useState } from "react";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { useLiveSync } from "@/lib/events/useLiveSync";
import type { LiveRosterResponse } from "@/app/api/teammates/live/route";
import { useLanguage } from "@/components/language/LanguageProvider";

/** Compact availability rows for the booking sidebar. */
export function LiveTeammates({ gameSlug, eta }: { gameSlug: string; eta?: string }) {
  const { p } = useLanguage();
  const [data, setData] = useState<LiveRosterResponse | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/teammates/live?game=${encodeURIComponent(gameSlug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setData((await res.json()) as LiveRosterResponse);
    } catch {
      // Keep the neutral loading value if availability cannot be refreshed.
    }
  };

  const [loadedFor, setLoadedFor] = useState(gameSlug);
  if (loadedFor !== gameSlug) {
    setLoadedFor(gameSlug);
    setData(null);
  }

  useLiveSync("dispatch", load, 60_000, { key: gameSlug });

  const online = data?.online ?? 0;
  const shown = data?.teammates.slice(0, 3) ?? [];
  const hidden = data ? Math.max(0, data.online - shown.length) : 0;

  return (
    <div className="roster-rows">
      <div className="booking-sidebar__row roster-row">
        <span>{p("Available now")}</span>
        <span className="roster-row__value" aria-label={`${online} ${p("teammates available now")}`}>
          {data && online > 0 ? (
            <span className="roster-row__stack" aria-hidden="true">
              {shown.map((teammate) => (
                <span className="roster-row__face" key={teammate.id} title={teammate.name}>
                  <SafeAvatarImage src={teammate.avatarUrl} frame={teammate} alt="" />
                </span>
              ))}
              {hidden > 0 && <span className="roster-row__face roster-row__face--more">+{hidden}</span>}
            </span>
          ) : (
            <b>{data ? "0" : "…"}</b>
          )}
        </span>
      </div>

      {eta && (
        <div className="booking-sidebar__row booking-sidebar__row--last roster-row">
          <span>{p("Typical wait")}</span>
          <b>{eta}</b>
        </div>
      )}
    </div>
  );
}
