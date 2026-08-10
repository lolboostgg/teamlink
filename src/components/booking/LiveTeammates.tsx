"use client";

import { useState } from "react";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { formatRank, rankIcon, rankColor } from "@/lib/gameRanks";
import { useLiveSync } from "@/lib/events/useLiveSync";
import type { LiveRosterResponse } from "@/app/api/teammates/live/route";

/**
 * Who is online for this game, on the booking page, above the pay button.
 *
 * The question every buyer has and the page did not answer until after the
 * money: who actually shows up? Names, avatars, ranks, ratings and review
 * counts are all read from the roster — nothing here is illustrative. If
 * nobody is online it says so, because "0 online" is information a customer
 * can act on and a fake row is not.
 *
 * Fetched client-side on purpose: the landing page is prerendered and served
 * from the edge, and a live roster read would make every visit a Node
 * request. This costs one small call after paint instead.
 */
export function LiveTeammates({ gameSlug, gameName }: { gameSlug: string; gameName: string }) {
  const [data, setData] = useState<LiveRosterResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/teammates/live?game=${encodeURIComponent(gameSlug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setData((await res.json()) as LiveRosterResponse);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  // Clearing on a game switch happens during render, not in an effect: an
  // effect clears it a frame after the new game has painted, so the panel
  // shows the previous game's roster for that frame.
  const [loadedFor, setLoadedFor] = useState(gameSlug);
  if (loadedFor !== gameSlug) {
    setLoadedFor(gameSlug);
    setData(null);
  }

  // Re-read on the game changing, and keep it fresh while the panel is open —
  // availability is the one number here that goes stale in a minute.
  useLiveSync("dispatch", load, 60_000, { key: gameSlug });

  // Nothing at all rather than a skeleton that turns out to be empty: this
  // block sits directly above the CTA, and a placeholder that resolves to
  // "nobody" reads worse than never having been there.
  if (failed || !data) return null;

  if (data.online === 0) {
    return (
      <div className="live-roster live-roster--empty">
        <span className="live-roster__dot live-roster__dot--off" aria-hidden="true" />
        <div>
          <strong>No {gameName} teammates online right now</strong>
          <p>Book anyway — the order waits, and the first one online takes it. You are only charged once it starts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="live-roster">
      <div className="live-roster__head">
        <span className="live-roster__dot" aria-hidden="true" />
        <strong>
          {data.online} {data.online === 1 ? "teammate" : "teammates"} online
        </strong>
        {data.totalReviews > 0 && data.averageRating !== null && (
          <span className="live-roster__rating">
            <i className="fa-solid fa-star" aria-hidden="true" /> {data.averageRating.toFixed(1)} ·{" "}
            {data.totalReviews} {data.totalReviews === 1 ? "review" : "reviews"}
          </span>
        )}
      </div>

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
                  {/* Only shown once there is something behind it. A 5.0 with
                      no reviews is the default column value, not a rating. */}
                  {teammate.reviewCount > 0 && (
                    <span>
                      <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} (
                      {teammate.reviewCount})
                    </span>
                  )}
                  {teammate.sessions > 0 && <span>{teammate.sessions} sessions</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {data.online > data.teammates.length && (
        <p className="live-roster__more">
          +{data.online - data.teammates.length} more online for {gameName}
        </p>
      )}
    </div>
  );
}
