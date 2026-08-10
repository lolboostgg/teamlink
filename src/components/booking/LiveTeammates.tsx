"use client";

import { useState } from "react";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { formatRank, rankIcon, rankColor } from "@/lib/gameRanks";
import { useLiveSync } from "@/lib/events/useLiveSync";
import type { LiveRosterResponse } from "@/app/api/teammates/live/route";

/**
 * Availability, in the booking sidebar: how long the wait is, how many
 * teammates could take this order right now, and who they are.
 *
 * It answers the question the page used to leave until after the payment —
 * who actually shows up. Names, avatars, ranks, ratings and session counts
 * are all read from the roster; a teammate with no reviews shows no rating,
 * because 5.0 is that column's default and not an opinion anybody held.
 *
 * It also absorbed the old "queue right now" chip. The two sat a few pixels
 * apart making the same promise, and together they pushed the sidebar past
 * the height it was built for — which is how the total came to be printed
 * over the last step of the list.
 *
 * The header renders immediately, before the fetch: this replaced a chip that
 * always said something, so it has to say something too. Only the faces wait.
 */
export function LiveTeammates({
  gameSlug,
  gameName,
  eta,
}: {
  gameSlug: string;
  gameName: string;
  /** The queue wait for the selected mode, shown beside the count. */
  eta?: string;
}) {
  const [data, setData] = useState<LiveRosterResponse | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/teammates/live?game=${encodeURIComponent(gameSlug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setData((await res.json()) as LiveRosterResponse);
    } catch {
      // Leaves the header on its "checking" line rather than replacing the
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

  const quiet = data?.online === 0;
  const heading = !data
    ? "Checking availability…"
    : quiet
      ? `No ${gameName} teammates online`
      : `${data.online} ${data.online === 1 ? "teammate" : "teammates"} online`;

  return (
    <div className={`live-roster${quiet ? " is-quiet" : ""}`}>
      <div className="live-roster__head">
        <span className={`live-roster__dot${!data || quiet ? " live-roster__dot--off" : ""}`} aria-hidden="true" />
        <strong>{heading}</strong>
        {eta && <span className="live-roster__eta">{eta}</span>}
      </div>

      {quiet && (
        <p className="live-roster__quiet">
          Book anyway — the order waits and the first one online takes it. Nothing is charged until it starts.
        </p>
      )}

      {data && data.online > 0 && (
        <>
          <ul className="live-roster__list">
            {data.teammates.map((teammate) => {
              const rankLabel = formatRank(gameSlug, teammate.rank, null);
              const art = teammate.rank ? rankIcon(gameSlug, teammate.rank) : null;
              return (
                <li key={teammate.id} className="live-teammate">
                  <span className="live-teammate__avatar">
                    <SafeAvatarImage src={teammate.avatarUrl} frame={teammate} />
                  </span>
                  <span className="live-teammate__body">
                    <span className="live-teammate__name">{teammate.name}</span>
                    <span className="live-teammate__meta">
                      {rankLabel && (
                        <span className="live-teammate__rank" style={{ color: rankColor(teammate.rank) ?? undefined }}>
                          {art && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={art} alt="" />
                          )}
                          {rankLabel}
                        </span>
                      )}
                      {teammate.reviewCount > 0 && (
                        <span>
                          <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} (
                          {teammate.reviewCount})
                        </span>
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          {data.online > data.teammates.length && (
            <p className="live-roster__more">+{data.online - data.teammates.length} more online right now</p>
          )}
        </>
      )}
    </div>
  );
}
