"use client";

import { useState } from "react";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { formatRank, rankColor } from "@/lib/gameRanks";
import { useLiveSync } from "@/lib/events/useLiveSync";
import type { LiveRosterResponse } from "@/app/api/teammates/live/route";

/**
 * Availability, in the booking sidebar: who could take this order right now,
 * how strong the best of them is, how they are rated, and how long the wait
 * is — as a stack of faces rather than a list of rows.
 *
 * The stack is the point. A list answers "who is online" one name at a time
 * and grows a row per person; overlapping avatars answer "how many, and are
 * they real people" in a single glance, at a fixed height whatever the number.
 *
 * Everything in it is read from the roster. The rank is the strongest anyone
 * online actually entered for this game, the average is weighted by review
 * count, and a teammate nobody has rated contributes no rating at all —
 * 5.0 is that column's default, not an opinion somebody held.
 *
 * It also absorbed the old "queue right now" chip: the two sat a few pixels
 * apart answering the same question, and together they pushed the sidebar
 * past its own height, which is how the total came to print over the last
 * step of the list.
 *
 * The frame renders before the fetch, because it replaced something that
 * always said a number. Only the faces wait.
 */
export function LiveTeammates({
  gameSlug,
  gameName,
  eta,
}: {
  gameSlug: string;
  gameName: string;
  /** The queue wait for the selected mode. */
  eta?: string;
}) {
  const [data, setData] = useState<LiveRosterResponse | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/teammates/live?game=${encodeURIComponent(gameSlug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setData((await res.json()) as LiveRosterResponse);
    } catch {
      // Leaves the frame on its "checking" line rather than replacing the
      // block with an error nobody can act on.
    }
  };

  // Clearing on a game switch happens during render, not in an effect: an
  // effect clears it a frame after the new game has painted, so the panel
  // would show the previous game's roster for that frame.
  const [loadedFor, setLoadedFor] = useState(gameSlug);
  if (loadedFor !== gameSlug) {
    setLoadedFor(gameSlug);
    setData(null);
  }

  useLiveSync("dispatch", load, 60_000, { key: gameSlug });

  const online = data?.online ?? 0;
  const quiet = data !== null && online === 0;
  const rankLabel = data?.topRank ? formatRank(gameSlug, data.topRank, null) : null;
  const rankTone = data?.topRank ? rankColor(data.topRank) : null;
  const hidden = data ? Math.max(0, data.online - data.teammates.length) : 0;

  return (
    <div
      className={`roster${quiet ? " is-quiet" : ""}`}
      // The best rank online tints the avatar rings and the headline word, so
      // a Grandmaster stack reads differently from a Diamond one at a glance.
      style={rankTone ? ({ "--rank-tone": rankTone } as React.CSSProperties) : undefined}
    >
      <div className="roster__glow" aria-hidden="true" />

      {data && online > 0 && (
        <div className="roster__stack">
          {data.teammates.map((teammate) => (
            <span className="roster__face" key={teammate.id} title={teammate.name}>
              <SafeAvatarImage src={teammate.avatarUrl} frame={teammate} alt={teammate.name} />
            </span>
          ))}
          {hidden > 0 && <span className="roster__face roster__face--more">+{hidden}</span>}
        </div>
      )}

      <div className="roster__line">
        <span className={`roster__dot${!data || quiet ? " is-off" : ""}`} aria-hidden="true" />
        <strong>
          {!data ? "Checking availability…" : quiet ? `No ${gameName} teammates online` : `${online} online now`}
        </strong>
      </div>

      {quiet ? (
        <p className="roster__quiet">
          Book anyway — the order waits and the first one online takes it. Nothing is charged until it starts.
        </p>
      ) : (
        <p className="roster__facts">
          {rankLabel && (
            <>
              up to <b className="roster__rank">{rankLabel}</b>
            </>
          )}
          {rankLabel && data && data.totalReviews > 0 && " · "}
          {data && data.averageRating !== null && data.totalReviews > 0 && (
            <>
              <i className="fa-solid fa-star" aria-hidden="true" /> {data.averageRating.toFixed(1)} from{" "}
              {data.totalReviews} {data.totalReviews === 1 ? "rating" : "ratings"}
            </>
          )}
        </p>
      )}

      {eta && (
        <div className="roster__wait">
          <span>Typical wait</span>
          <b>{eta}</b>
        </div>
      )}
    </div>
  );
}
